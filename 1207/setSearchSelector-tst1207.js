/*jshint esversion: 6 */

var https = require('https');
var fs = require('fs');
var debug = require('debug');
const util = require('util');
var parseString = require('xml2js').parseString;
var MongoClient = require('mongodb').MongoClient;

var mdbUrl = 'mongodb://tst.tourbooks.cc:27017/tourbooks1207';

var contentTypeId = {
	"city" : "57ed26a06d0e810b357b23c7",
	"attraction" : "57ea19736d0e81454c7b23d2",
	"tours" : "5763a39b6d0e81055c8b456f"
};

//SS means taxonomy - Search Selector
var taxonomySSVocabularyId = {
	"searchSelector" : "58771e4aa0af88a36c2d3976"
};

var taxonomySSTermsId = {
	"generalSearch" : "58771eb5a0af8863602d3989",
	"whs" : "58771ecca0af88735e2d397b",
	"np" : "58771edfa0af8891692d3977",
	"museum" : "58771ef4a0af88526a2d3978"
};

MongoClient.connect(mdbUrl, (err, db) => {
	if(null === err) console.log("Connected successfully to server");

	var collection = db.collection('Contents');

	var cityCount = -1;
	var attractionCount = -1;
	var toursCount = -1;

	var wait4CityComplete = () => {
		cityCount--;
		if(0 === cityCount){
			wait4AllComplete();
		}
	};

	var wait4AttractionComplete = () => {
		attractionCount--;
		if(0 === attractionCount){
			wait4AllComplete();
		}
	};

	var wait4ToursComplete = () => {
		toursCount--;
		if(0 === toursCount){
			wait4AllComplete();
		}
	};

	var wait4AllComplete = () => {
		if(0 === cityCount && 0 === attractionCount && 0 === toursCount){
			db.close();
			console.log('*** All Complete! ***');
		}
	};

	var projectParam = {
		_id:1,
		text:1,
		workspace:1
	};

	var queryParam4City = { "typeId" : contentTypeId.city };
	collection.find(queryParam4City).project(projectParam).toArray()
		.then((d) => {
			cityCount = d.length;

			d.forEach((item) => {
				var updateFlag = false, insertFlag = false;
				var filter = { _id:item._id};
				var tValue = [];
				var updateField = {};
				updateField.workspace = item.workspace;
				updateField.live = {};
				var update = {
						$set: updateField
					};

				if(undefined !== updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector]){
					if( -1 === updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector].indexOf(taxonomySSTermsId.generalSearch) ){
						updateFlag = true;
					}
				} else {
					insertFlag = true;
				}

				if(updateFlag || insertFlag){
					if(updateFlag){
						tValue = updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector];
					}
					tValue.push(taxonomySSTermsId.generalSearch);
					updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector] = tValue;
					updateField.live = updateField.workspace;

					collection.updateOne(filter, update)
						.then((r) => {
							wait4CityComplete();
						})
						.catch((e) => {
							console.log('insert city taxonomy error!  ' + e);
						});
				} else {
					wait4CityComplete();
				}
			});
		})
		.catch((e) => {
			console.log('find city error! ' + e);
		});

	var queryParam4Attraction = { "typeId" : contentTypeId.attraction };
	collection.find(queryParam4Attraction).project(projectParam).toArray()
		.then((d) => {
			attractionCount = d.length;

			d.forEach((item) => {
				var updateFlag = false, insertFlag = false;
				var filter = { _id:item._id};
				var tValue = [];
				var updateField = {};
				updateField.workspace = item.workspace;
				updateField.live = {};
				var update = {
						$set: updateField
					};

				if(undefined !== updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector]){
					if( -1 === updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector].indexOf(taxonomySSTermsId.generalSearch) ){
						updateFlag = true;
					}
				} else {
					insertFlag = true;
				}

				if(updateFlag || insertFlag){
					if(updateFlag){
						tValue = updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector];
					}
					tValue.push(taxonomySSTermsId.generalSearch);
					updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector] = tValue;
					updateField.live = updateField.workspace;

					collection.updateOne(filter, update)
						.then((r) => {
							wait4AttractionComplete();
						})
						.catch((e) => {
							console.log('insert attraction taxonomy error!  ' + e);
						});
				} else {
					wait4AttractionComplete();
				}
			});
		})
		.catch((e) => {
			console.log('find attraction error! ' + e);
		});

	var queryParam4Tours = { "typeId" : contentTypeId.tours };
	collection.find(queryParam4Tours).project(projectParam).toArray()
		.then((d) => {
			toursCount = d.length;

			d.forEach((item) => {
				var updateFlag = false, insertFlag = false;
				var filter = { _id:item._id};
				var tValue = [];
				var updateField = {};
				updateField.workspace = item.workspace;
				updateField.live = {};
				var update = {
						$set: updateField
					};

				if(undefined !== updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector]){
					if( -1 === updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector].indexOf(taxonomySSTermsId.generalSearch) ){
						updateFlag = true;
					}
				} else {
					insertFlag = true;
				}

				if(updateFlag || insertFlag){
					if(updateFlag){
						tValue = updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector];
					}
					tValue.push(taxonomySSTermsId.generalSearch);
					updateField.workspace.taxonomy[taxonomySSVocabularyId.searchSelector] = tValue;
					updateField.live = updateField.workspace;

					collection.updateOne(filter, update)
						.then((r) => {
							wait4ToursComplete();
						})
						.catch((e) => {
							console.log('insert tours taxonomy error!  ' + e);
						});
				} else {
					wait4ToursComplete();
				}
			});
		})
		.catch((e) => {
			console.log('find tours error! ' + e);
		});

});