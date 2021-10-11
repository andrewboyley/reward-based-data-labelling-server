import { Express, Request, Response, NextFunction } from "express";
import Mongoose from "mongoose";
import LabelledItemModel from "./item.model";
import JobController from "../job/job.controller";
import JobModel from "../job/job.model";
import BatchController from "../batch/batch.controller";
import BatchModel from "../batch/batch.model";

const desiredBatchSize = 10;

function determineSortedImageLabels(image: any) {
  // need to order the labels by frequency
  let labelFrequencies: any = {};

  for (let label of image.labels) {
    // looping through all the labels
    // increment a counter for the relevant value
    const values = label.value;

    for (let value of values) {
      if (value in labelFrequencies) {
        // we already have this label
        labelFrequencies[value]++;
      } else {
        // add this label to the dict
        labelFrequencies[value] = 1;
      }
    }
  }

  // now we have a mapping of labels to frequency
  // now SORT
  // Create an array
  const frequencyArray = Object.keys(labelFrequencies).map(function (key) {
    return [key, labelFrequencies[key]];
  });

  // Sort the array based on the second element
  frequencyArray.sort(function (first, second) {
    return second[1] - first[1];
  });

  // extract the keys from the array
  return frequencyArray.map((element: any) => {
    return element[0];
  });
}

//returns an array of just the correct labels for each image
function determineCorrectImageLabelsInJob(
  jobId: Mongoose.Types.ObjectId,
  images: any
) {
  let correctLabels = new Array<string>(images.length);
  for (let i = 0; i < images.length; i++) {
    correctLabels[i] = images[i].assignedLabels[0];
  }

  return correctLabels;
}

let ItemController = {
  getLabelFrequencies(image: any) {
    // need to order the labels by frequency
    let labelFrequencies: any = {};

    for (let label of image.labels) {
      // looping through all the labels
      // increment a counter for the relevant value
      const values = label.value;

      for (let value of values) {
        if (value in labelFrequencies) {
          // we already have this label
          labelFrequencies[value]++;
        } else {
          // add this label to the dict
          labelFrequencies[value] = 1;
        }
      }
    }

    const frequencyArray = Object.keys(labelFrequencies).map(function (key) {
      return [key, labelFrequencies[key]];
    });

    // Sort the array based on the second element
    frequencyArray.sort(function (first, second) {
      return second[1] - first[1];
    });

    return frequencyArray;
  },

  getLabelValues(image: any) {
    // need to order the labels by frequency
    let labelValues: any = {};

    for (let label of image.labels) {
      // looping through all the labels
      // increment a counter for the relevant value
      labelValues.addItem(label.value);
    }

    return labelValues;
  },
  // add all the pictures, and create the appropriate batches
  addItem: async (req: Request, res: Response, next: NextFunction) => {
    // get job Id from request body
    var jobID = req.body.jobID;

    // gets file uploaded from request and create new labelled item object
    var newLabelledItemObject;

    // update the data preview for the job
    // var aggImages = Array<any>();
    // var storedImages = Array<any>();

    //total number of batches given # of images
    const totalBatches = Math.max(
      Math.round((req.files.length as number) / desiredBatchSize),
      1
    );

    // adds batch size to parent job (leave await here or it doesnt work [???])
    await JobModel.findByIdAndUpdate(jobID, { total_batches: totalBatches });

    for (let i = 0; i < totalBatches; i++) {
      BatchController.create(i, Mongoose.Types.ObjectId(jobID));
    }

    for (var i = 0; i < req.files.length; i++) {
      // creates the new labelled item json object
      newLabelledItemObject = {
        value: (req.files as Express.Multer.File[])[i].filename,
        job: jobID,
        batchNumber: i % totalBatches,
      };

      // create a mongoose labelled item object
      let newLabelledItem = new LabelledItemModel(newLabelledItemObject);

      // if (aggImages.length < numItemsAggregated) {
      //   aggImages.push(newLabelledItem);
      // }

      // save the labelled item in the database
      try {
        const itemResponse = await newLabelledItem.save();
      } catch (err: any) {
        // something went wrong when saving the image
        res.status(500).send({
          message: err.message || "Some error occurred while saving the image.",
        });
        return;
      }
    }

    res.status(200).send("OK");
  },

  updateLabel: async (req: Request, res: Response, next: NextFunction) => {
    var itemid: string = req.params.labelid;
    var itemLabels: string[] = req.body.labels;

    LabelledItemModel.findById(itemid)
      .then((labelledItem: any) => {
        // check if this user exists - if yes, remove from labelledItem.labels array
        for (let i = labelledItem.labels.length - 1; i >= 0; i--) {
          if (
            String(req.body.userId) == String(labelledItem.labels[i].labeller)
          ) {
            // remove the user's labels
            labelledItem.labels.splice(i);
          }
        }

        // add the new labels to the image
        labelledItem.labels.push({
          labeller: req.body.userId,
          value: itemLabels,
        });

        labelledItem
          .save()
          .then((data: any) => {
            // return the updated label list for this user
            res.status(201).send(itemLabels);
          })
          .catch((err: any) => {
            if (err.message) {
              res.status(422).send({
                message: err.message,
              });
            } else {
              // some other error occurred
              res.status(500).send({
                message: "Some error occurred while creating the job.",
              });
            }
          });
      })
      .catch((err: any) => {
        if (err.kind === "ObjectId") {
          // something was wrong with the id - it was malformed
          return res.status(404).send({
            message: "Image not found with id " + req.params.labelid,
          });
        }

        // some other error occurred
        return res.status(500).send({
          message: "Error retrieving image with id " + req.params.labelid,
        });
      });
  },

  findAll: async (req: Request, res: Response, next: NextFunction) => {
    // return all the data for the specified job
    LabelledItemModel.find({ job: req.query.jobID })
      .then((items: any) => {
        res.send(items);
      })
      .catch((err: any) => {
        // something went wrong when getting the job
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving jobs.",
        });
      });
  },

  removeUserLabels: async (
    jobId: Mongoose.Types.ObjectId,
    batchNumber: number,
    userId: Mongoose.Types.ObjectId
  ) => {
    // find all the image belonging to this batch in this job
    // remove the labels assigned by this user from all of them
    // returns a boolean value indicating if the operations were successful or not
    const result = await LabelledItemModel.updateMany(
      {
        job: jobId,
        batchNumber: batchNumber,
      },
      { $pull: { labels: { labeller: userId } } }
    );

    return result ? true : false;
  },

  findImagesInBatch: async (
    jobId: Mongoose.Types.ObjectId,
    batchNumber: number
  ) => {
    // find all the images belonging to this batch for this job

    const images = await LabelledItemModel.find({
      job: jobId,
      batchNumber: batchNumber,
    });

    return images;
  },

  determineImageLabelsInJob: async (jobId: Mongoose.Types.ObjectId) => {
    // 1) find all the images in this job
    // 2) add an "assigned labels" property to each images

    // get all the images
    let images: any = await LabelledItemModel.find({
      job: jobId,
    });

    // something went wrong and couldn't get images
    if (!images) {
      return null;
    }

    // determine the image labels
    for (let i = 0; i < images.length; i++) {
      let image = images[i];
      image = image.toObject();
      image.assignedLabels = determineSortedImageLabels(image);
      delete image.labels;
      images[i] = image;
    }

    return images;
  },

  //returns an array only with the labellers who chose the majority label for each image
  determineCorrectLabllersInJob: async (jobId: Mongoose.Types.ObjectId) => {
	let images = await ItemController.determineImageLabelsInJob(jobId);

	let correctLabels = determineCorrectImageLabelsInJob(jobId,images);

	// get all the images
	let fullImageInfo: any = await LabelledItemModel.find({
		job: jobId,
	});

	// something went wrong and couldn't get images
	if (!fullImageInfo) {
		return null;
	}

	//We get the number of labellers required for this job
	let fullJob: any = await JobModel.find({
		_id: jobId,
	});

	let numLabellers = fullJob[0].numLabellersRequired;
	let image,labelInfo;
	let correctLabellers= [];
	let temp = [];


	for (let index = 0; index < fullImageInfo.length; index++) {
		image = fullImageInfo[index];
		temp = [];
		// console.log(image);
		for (let i = 0; i < numLabellers; i++) {
			labelInfo = image.labels[i];
			for (let j = 0; j < labelInfo.value.length; j++) {//labeller may have submitted many labels
				if(labelInfo.value[j] == correctLabels[index]){
					temp.push(labelInfo.labeller);
				}
				
			}
		}

		correctLabellers.push(temp);
	}

	return correctLabellers;
  }
};

export default ItemController;
export { determineSortedImageLabels };
export { determineCorrectImageLabelsInJob };
