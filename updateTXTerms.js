/*jshint esversion: 6 */

//Important category.csv and type.csv should be put into ./mapping folder
//then use csvtojson to convert them to json files

var fs = require('fs');
var debug = require('debug');
var debugDev = debug('dev');
const util = require('util');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const buUtil = require('./lib/bookurUtil.js')

var targetEnv = process.argv.slice(2)[0];
var dbOPSwitch = process.argv.slice(3)[0];

console.log('-------- updateTXTerms.js.js - args: targetEnv=%s, dbOPSwitch=%s', targetEnv, dbOPSwitch);

var operateDB = false;
let mdbUrl

let dbParam = buUtil.getMDBParam(targetEnv, dbOPSwitch)
targetEnv = dbParam.targetEnv
operateDB = dbParam.operateDB
mdbUrl = dbParam.mdbUrl

var txVocName = ['Tour Type','Tour Category','Tour Destination','City','Themes','Attraction','Destination','Country','State / Province'];
var txVocNameCount = txVocName.length;
var txVocId = {}, txTermsId = {};
	// txTermsId = {
	// 		"TourDestination": {
	// 			"Paris": "xxxxxxxxxxx",
	// 			"London": "xxxxxxxxxxx"
	// 		},
	// 		"TourCategory": {}
	// }

//base configuration


MongoClient.connect(mdbUrl, (err, db) => {
	if(null === err) console.log("Connected successfully to server - " + mdbUrl);

	var cltTX = db.collection('Taxonomy');
	var cltTXTerms = db.collection('TaxonomyTerms');

	var preparingData = () => {
		console.log('Enter data preparation ......')

		// get taxonomy vovaculary and id mapping
		var getTXVocId = ()=>{
			var count = txVocNameCount;
			var wait4txVocIdEnd = ()=>{
				count--;
				if(!count){
					debugDev('txVocId = ' + JSON.stringify(txVocId));
					fs.writeFileSync('./log/txVocId-' + targetEnv + '.json', JSON.stringify(txVocId));
					getTXTerms();
				}
			};

			txVocName.forEach((vocName)=>{
				var qry = {'name': vocName};
				var prj = {'_id':1, 'name': 1};
				cltTX.find(qry).project(prj).toArray()
					.then( (d)=>{
						d.forEach( (item)=>{
							debugDev('key = ' + item.name.replace(/\s+/g,'') + ', value = ' + item._id.toString());
							txVocId[item.name.replace(/\s+/g,'')] = item._id.toString();
						});
						wait4txVocIdEnd();
					})
					.catch( (e)=>{
						console.log('Finding taxonomy vocabulary ID error! - ' + e);
					});
			});
		}

		// get taxonomy terms based on txVocId
		// called at the end of getTXVocId
		var getTXTerms = ()=>{
			var count = txVocNameCount;
			var wait4AllVocEnd = ()=>{
				count--;
				if(!count){
					//debugDev('txTermsId = ' + JSON.stringify(txTermsId));
					fs.writeFileSync('./log/txTermsId-' + targetEnv + '.json', JSON.stringify(txTermsId));
					console.log('Exit data preparation ......')
					validateData();
				}
			};

			txVocName.forEach((vocName)=>{
				var key = vocName.replace(/\s+/g,'');
				var qry = {'vocabularyId': txVocId[key]};
				var prj = {'_id':1, 'text': 1};

				// var addTerms2txTermsId = (terms)=>{
				// 	txTermsId[key] = JSON.parse(terms);
				// 	wait4AllVocEnd();
				// }

				cltTXTerms.find(qry).project(prj).toArray()
					.then( (d)=>{
						var terms = {};
						d.forEach( (term)=>{
							terms[term.text] = term._id.toString();
						});
						debugDev('key - ' + key);
						txTermsId[key] = terms;
						wait4AllVocEnd();
					})
					.catch( (e)=>{
						console.log('Finding taxonomy terms ID error! - ' + e);
					});
			});
		}

		// preparingData starting point
		getTXVocId();
	};

	// compare category.json and type.json in ./mapping folder with txTermsId 
	// to confirm if taxonomy terms should be inserted
	
	var tourTypeToBeInserted = [];
	var tourCategoryToBeInserted = [];
	var tourDestinationToBeInserted = [];
	var cityToBeInserted = [];
	var themesToBeInserted = [];
	var attractionToBeInserted = [];
	var destinationToBeInserted = [];
	var countryToBeInserted = [];
	var stateToBeInserted = [];

	var validateData = () =>{
		var cats = require('./mapping/category.json');
		var types = require('./mapping/type.json');
		var dests = require('./mapping/dest.json');
		var cities = require('./mapping/cities.json');
		var themes = require('./mapping/themes.json');
		var atts = require('./mapping/txAtts.json'); //should run updateContextualizationBTWAtts.js first
		var tduls = require('./mapping/tdul.json');
		var countries = require('./mapping/country.json');
		var states = require('./mapping/stateProvince.json');


		console.log('Validate TX Tour Type ......')
		types.forEach((type)=>{
			if(!txTermsId['TourType'][type.TargetType]){
				if(-1 === tourTypeToBeInserted.indexOf(type.TargetType))
					tourTypeToBeInserted.push(type.TargetType);
			}
		});

		console.log('Validate TX Tour Category ......')
		cats.forEach((cat)=>{
			if(!txTermsId['TourCategory'][cat.TargetCategory]){
				if(-1 === tourCategoryToBeInserted.indexOf(cat.TargetCategory))
					tourCategoryToBeInserted.push(cat.TargetCategory);
			}
		});

		console.log('Validate TX Tour Destination ......')
		dests.forEach((dest)=>{
			if(!txTermsId['TourDestination'][dest.Title]){
				if(-1 === tourDestinationToBeInserted.indexOf(dest.Title))
					tourDestinationToBeInserted.push(dest.Title);
			}
		});

		console.log('Validate TX City ......')
		cities.forEach((city)=>{
			if(!txTermsId['City'][city.Title]){
				if(-1 === cityToBeInserted.indexOf(city.Title))
					cityToBeInserted.push(city.Title);
			}
		});

		console.log('Validate TX Themes ......')
		themes.forEach((theme)=>{
			if(!txTermsId['Themes'][theme.Title]){
				if(-1 === themesToBeInserted.indexOf(theme.Title))
					themesToBeInserted.push(theme.Title);
			}
		});

		console.log('Validate TX Attraction ......')
		atts.forEach((att)=>{
			if(!txTermsId['Attraction'][att.Title]){
				if(-1 === attractionToBeInserted.indexOf(att.Title))
					attractionToBeInserted.push(att.Title);
			}
		});

		console.log('Validate TX Destination ......')
		tduls.forEach((tdul)=>{
			if(!txTermsId['Destination'][tdul.Title]){
				if(-1 === destinationToBeInserted.indexOf(tdul.Title))
					destinationToBeInserted.push(tdul.Title);
			}
		});

		console.log('Validate TX Country ......')
		countries.forEach((country)=>{
			if(!txTermsId['Country'][country.Title]){
				if(-1 === countryToBeInserted.indexOf(country.Title))
					countryToBeInserted.push(country.Title);
			}
		});

		console.log('Validate TX State/Province ......')
		states.forEach((state)=>{
			if(!txTermsId['State/Province'][state.Title]){
				if(-1 === stateToBeInserted.indexOf(state.Title))
					stateToBeInserted.push(state.Title);
			}
		});

		fs.writeFileSync('./log/tourTypeToBeInserted-' + targetEnv + '.json', JSON.stringify(tourTypeToBeInserted));
		fs.writeFileSync('./log/tourCategoryToBeInserted-' + targetEnv + '.json', JSON.stringify(tourCategoryToBeInserted));
		fs.writeFileSync('./log/tourDestinationToBeInserted-' + targetEnv + '.json', JSON.stringify(tourDestinationToBeInserted));
		fs.writeFileSync('./log/cityToBeInserted-' + targetEnv + '.json', JSON.stringify(cityToBeInserted));
		fs.writeFileSync('./log/themesToBeInserted-' + targetEnv + '.json', JSON.stringify(themesToBeInserted));
		fs.writeFileSync('./log/attractionToBeInserted-' + targetEnv + '.json', JSON.stringify(attractionToBeInserted));
		fs.writeFileSync('./log/destinationToBeInserted-' + targetEnv + '.json', JSON.stringify(destinationToBeInserted));
		fs.writeFileSync('./log/countryToBeInserted-' + targetEnv + '.json', JSON.stringify(countryToBeInserted));
		fs.writeFileSync('./log/stateToBeInserted-' + targetEnv + '.json', JSON.stringify(stateToBeInserted));

		if(tourCategoryToBeInserted.length || tourTypeToBeInserted.length || tourDestinationToBeInserted.length || cityToBeInserted.length || themesToBeInserted.length || attractionToBeInserted.length || destinationToBeInserted.length || countryToBeInserted.length || stateToBeInserted.length){
			if(operateDB){
				insertData();
			} else {
				console.log('operateDB = False so escape...');
				endProgram();
			}
		} else {
			console.log('Nothing to insert...');
			endProgram();
		}		
	}

	var insertData = ()=>{
		console.log('Enter insertData ......')

		var insertOptions = {forceServerObjectId:true};
		var txTermDocTemplate = {
			text: '', //term
			version: 1,
			vocabularyId: '', //txVocId[vocabulary];
			orderValue: 100,
			expandable: false,
			nativeLanguage: 'en',
			i18n: {
				en: {
					text: '', //term
					locale: 'en',
				}
			},
			parentId: 'root',
			lastUpdateUser: {
				id: "55a4ab8b86c747a0758b4567",
				login: "admin",
				fullName: "Web Admin" 		
			},
			createUser: {
				id: "55a4ab8b86c747a0758b4567",
				login: "admin",
				fullName: "Web Admin" 		
			},
			createTime: parseInt((Date.now()/1000).toFixed(0)),
			lastUpdateTime: parseInt((Date.now()/1000).toFixed(0))
		};

		var tourTypeInsertLog = '';
		var tourCategoryInsertLog = '';
		var tourDestinationInsertLog = '';
		var cityInsertLog = '';
		var themesInsertLog = '';
		var attractionInsertLog = '';
		var destinationInsertLog = '';
		var countryInsertLog = '';
		var stateInsertLog = '';

		var allInsertCount = 9;
		var wait4AllInsertionEnd = ()=>{
			allInsertCount--;
			if(!allInsertCount){
				fs.writeFileSync('./log/tourTypeInsertLog-' + targetEnv + '.log', tourTypeInsertLog);
				fs.writeFileSync('./log/tourCategoryInsertLog-' + targetEnv + '.log', tourCategoryInsertLog);
				fs.writeFileSync('./log/tourDestinationInsertLog-' + targetEnv + '.log', tourDestinationInsertLog);
				fs.writeFileSync('./log/cityInsertLog-' + targetEnv + '.log', cityInsertLog);
				fs.writeFileSync('./log/themesInsertLog-' + targetEnv + '.log', themesInsertLog);
				fs.writeFileSync('./log/attractionInsertLog-' + targetEnv + '.log', attractionInsertLog);
				fs.writeFileSync('./log/destinationInsertLog-' + targetEnv + '.log', destinationInsertLog);
				fs.writeFileSync('./log/countryInsertLog-' + targetEnv + '.log', countryInsertLog);
				fs.writeFileSync('./log/stateInsertLog-' + targetEnv + '.log', stateInsertLog);
				endProgram();
			}
		}


		if(tourTypeToBeInserted.length){
			console.log('Tour Type Insertion Starts......');

			var tourTypeInsertCount = tourTypeToBeInserted.length;
			var wait4TourTypeInsertionEnd = () => {
				tourTypeInsertCount--;
				if(!tourTypeInsertCount){
					wait4AllInsertionEnd();
				}
			};


			tourTypeToBeInserted.forEach((type)=>{
				var txTermDoc = (JSON.parse(JSON.stringify(txTermDocTemplate)));

				txTermDoc.text = type;
				txTermDoc.vocabularyId = txVocId.TourType;
				txTermDoc.i18n.en.text = type;
				txTermDoc.createTime = parseInt((Date.now()/1000).toFixed(0));
				txTermDoc.lastUpdateTime = txTermDoc.createTime;

				cltTXTerms.insertOne(txTermDoc,insertOptions)
					.then((r)=>{
						if(1 === r.result.ok){
							debugDev('Insert taxonomy Tour Type - term - ' + type + ' - Succeeded!!');
							tourTypeInsertLog += 'Insert taxonomy Tour Type - term - ' + type + ' - Succeeded!!' + '\n';
							wait4TourTypeInsertionEnd();						
						}
					})
					.catch((e)=>{
						console.log('Insert taxonomy Tour Type - term - ' + type + ' -  Exception Error Happened!! - ' + e);
						tourTypeInsertLog += 'Insert taxonomy Tour Type - term - ' + type + ' -  Exception Error Happened!! - ' + e + '\n';
						wait4TourTypeInsertionEnd();
					});

			});
		} else {
			wait4AllInsertionEnd();
		}

		if(tourCategoryToBeInserted.length){
			console.log('Tour Category Insertion Starts......');

			var tourCatInsertCount = tourCategoryToBeInserted.length;
			var wait4TourCatInsertionEnd = () => {
				tourCatInsertCount--;
				if(!tourCatInsertCount){
					wait4AllInsertionEnd();
				}
			};


			tourCategoryToBeInserted.forEach((cat)=>{
				var txTermDoc = (JSON.parse(JSON.stringify(txTermDocTemplate)));

				txTermDoc.text = cat;
				txTermDoc.vocabularyId = txVocId.TourCategory;
				txTermDoc.i18n.en.text = cat;
				txTermDoc.createTime = parseInt((Date.now()/1000).toFixed(0));
				txTermDoc.lastUpdateTime = txTermDoc.createTime;

				cltTXTerms.insertOne(txTermDoc,insertOptions)
					.then((r)=>{
						if(1 === r.result.ok){
							debugDev('Insert taxonomy Tour Category - term - ' + cat + ' - Succeeded!!');
							tourCategoryInsertLog += 'Insert taxonomy Tour Category - term - ' + cat + ' - Succeeded!!' + '\n';
							wait4TourCatInsertionEnd();						
						}
					})
					.catch((e)=>{
						console.log('Insert taxonomy Tour Category - term - ' + cat + ' -  Exception Error Happened!! - ' + e);
						tourCategoryInsertLog += 'Insert taxonomy Tour Category - term - ' + cat + ' -  Exception Error Happened!! - ' + e + '\n';
						wait4TourCatInsertionEnd();
					});

			});

		} else {
			wait4AllInsertionEnd();
		}

		if(tourDestinationToBeInserted.length){
			console.log('Tour Destination Insertion Starts......');

			var tourDestInsertCount = tourDestinationToBeInserted.length;
			var wait4TourDestInsertionEnd = () => {
				tourDestInsertCount--;
				if(!tourDestInsertCount){
					wait4AllInsertionEnd();
				}
			};


			tourDestinationToBeInserted.forEach((dest)=>{
				var txTermDoc = (JSON.parse(JSON.stringify(txTermDocTemplate)));

				txTermDoc.text = dest;
				txTermDoc.vocabularyId = txVocId.TourDestination;
				txTermDoc.i18n.en.text = dest;
				txTermDoc.createTime = parseInt((Date.now()/1000).toFixed(0));
				txTermDoc.lastUpdateTime = txTermDoc.createTime;

				cltTXTerms.insertOne(txTermDoc,insertOptions)
					.then((r)=>{
						if(1 === r.result.ok){
							debugDev('Insert taxonomy Tour Destination - term - ' + dest + ' - Succeeded!!');
							tourDestinationInsertLog += 'Insert taxonomy Tour Destination - term - ' + dest + ' - Succeeded!!' + '\n';
							wait4TourDestInsertionEnd();						
						}
					})
					.catch((e)=>{
						console.log('Insert taxonomy Tour Destination - term - ' + dest + ' -  Exception Error Happened!! - ' + e);
						tourDestinationInsertLog += 'Insert taxonomy Tour Destination - term - ' + dest + ' -  Exception Error Happened!! - ' + e + '\n';
						wait4TourDestInsertionEnd();
					});

			});

		} else {
			wait4AllInsertionEnd();
		}

		if(cityToBeInserted.length){
			console.log('TX City Insertion Starts......');

			var cityInsertCount = cityToBeInserted.length;
			var wait4CityInsertionEnd = () => {
				cityInsertCount--;
				if(!cityInsertCount){
					wait4AllInsertionEnd();
				}
			};


			cityToBeInserted.forEach((city)=>{
				var txTermDoc = (JSON.parse(JSON.stringify(txTermDocTemplate)));

				txTermDoc.text = city;
				txTermDoc.vocabularyId = txVocId.City;
				txTermDoc.i18n.en.text = city;
				txTermDoc.createTime = parseInt((Date.now()/1000).toFixed(0));
				txTermDoc.lastUpdateTime = txTermDoc.createTime;

				cltTXTerms.insertOne(txTermDoc,insertOptions)
					.then((r)=>{
						if(1 === r.result.ok){
							debugDev('Insert taxonomy City - term - ' + city + ' - Succeeded!!');
							cityInsertLog += 'Insert taxonomy City - term - ' + city + ' - Succeeded!!' + '\n';
							wait4CityInsertionEnd();						
						}
					})
					.catch((e)=>{
						console.log('Insert taxonomy City - term - ' + city + ' -  Exception Error Happened!! - ' + e);
						cityInsertLog += 'Insert taxonomy City - term - ' + city + ' -  Exception Error Happened!! - ' + e + '\n';
						wait4CityInsertionEnd();
					});

			});

		} else {
			wait4AllInsertionEnd();
		}

		if(themesToBeInserted.length){
			console.log('TX Themes Insertion Starts......');

			var themesInsertCount = themesToBeInserted.length;
			var wait4ThemesInsertionEnd = () => {
				themesInsertCount--;
				if(!themesInsertCount){
					wait4AllInsertionEnd();
				}
			};


			themesToBeInserted.forEach((theme)=>{
				var txTermDoc = (JSON.parse(JSON.stringify(txTermDocTemplate)));

				txTermDoc.text = theme;
				txTermDoc.vocabularyId = txVocId.Themes;
				txTermDoc.i18n.en.text = theme;
				txTermDoc.createTime = parseInt((Date.now()/1000).toFixed(0));
				txTermDoc.lastUpdateTime = txTermDoc.createTime;

				cltTXTerms.insertOne(txTermDoc,insertOptions)
					.then((r)=>{
						if(1 === r.result.ok){
							debugDev('Insert taxonomy Themes - term - ' + theme + ' - Succeeded!!');
							themesInsertLog += 'Insert taxonomy Themes - term - ' + theme + ' - Succeeded!!' + '\n';
							wait4ThemesInsertionEnd();						
						}
					})
					.catch((e)=>{
						console.log('Insert taxonomy Themes - term - ' + theme + ' -  Exception Error Happened!! - ' + e);
						themesInsertLog += 'Insert taxonomy Themes - term - ' + theme + ' -  Exception Error Happened!! - ' + e + '\n';
						wait4ThemesInsertionEnd();
					});

			});

		} else {
			wait4AllInsertionEnd();
		}	

		if(attractionToBeInserted.length){
			console.log('TX Attraction Insertion Starts......');

			var attractionInsertCount = attractionToBeInserted.length;
			var wait4AttractionInsertionEnd = () => {
				attractionInsertCount--;
				if(!attractionInsertCount){
					wait4AllInsertionEnd();
				}
			};


			attractionToBeInserted.forEach((att)=>{
				var txTermDoc = (JSON.parse(JSON.stringify(txTermDocTemplate)));

				txTermDoc.text = att;
				txTermDoc.vocabularyId = txVocId.Attraction;
				txTermDoc.i18n.en.text = att;
				txTermDoc.createTime = parseInt((Date.now()/1000).toFixed(0));
				txTermDoc.lastUpdateTime = txTermDoc.createTime;

				cltTXTerms.insertOne(txTermDoc,insertOptions)
					.then((r)=>{
						if(1 === r.result.ok){
							debugDev('Insert taxonomy Attraction - term - ' + att + ' - Succeeded!!');
							attractionInsertLog += 'Insert taxonomy Attraction - term - ' + att + ' - Succeeded!!' + '\n';
							wait4AttractionInsertionEnd();						
						}
					})
					.catch((e)=>{
						console.log('Insert taxonomy Attraction - term - ' + att + ' -  Exception Error Happened!! - ' + e);
						attractionInsertLog += 'Insert taxonomy Attraction - term - ' + att + ' -  Exception Error Happened!! - ' + e + '\n';
						wait4AttractionInsertionEnd();
					});

			});

		} else {
			wait4AllInsertionEnd();
		}

		if(destinationToBeInserted.length){
			console.log('TX Destination Insertion Starts......');

			var destinationInsertCount = destinationToBeInserted.length;
			var wait4DestinationInsertionEnd = () => {
				destinationInsertCount--;
				if(!destinationInsertCount){
					wait4AllInsertionEnd();
				}
			};


			destinationToBeInserted.forEach((tdul)=>{
				var txTermDoc = (JSON.parse(JSON.stringify(txTermDocTemplate)));

				txTermDoc.text = tdul;
				txTermDoc.vocabularyId = txVocId.Destination;
				txTermDoc.i18n.en.text = tdul;
				txTermDoc.createTime = parseInt((Date.now()/1000).toFixed(0));
				txTermDoc.lastUpdateTime = txTermDoc.createTime;

				cltTXTerms.insertOne(txTermDoc,insertOptions)
					.then((r)=>{
						if(1 === r.result.ok){
							debugDev('Insert taxonomy Destination - term - ' + tdul + ' - Succeeded!!');
							destinationInsertLog += 'Insert taxonomy Destination - term - ' + tdul + ' - Succeeded!!' + '\n';
							wait4DestinationInsertionEnd();						
						}
					})
					.catch((e)=>{
						console.log('Insert taxonomy Destination - term - ' + tdul + ' -  Exception Error Happened!! - ' + e);
						destinationInsertLog += 'Insert taxonomy Destination - term - ' + tdul + ' -  Exception Error Happened!! - ' + e + '\n';
						wait4DestinationInsertionEnd();
					});

			});

		} else {
			wait4AllInsertionEnd();
		}

		if(countryToBeInserted.length){
			console.log('TX Country Insertion Starts......');

			var countryInsertCount = countryToBeInserted.length;
			var wait4CountryInsertionEnd = () => {
				countryInsertCount--;
				if(!countryInsertCount){
					wait4AllInsertionEnd();
				}
			};


			countryToBeInserted.forEach((country)=>{
				var txTermDoc = (JSON.parse(JSON.stringify(txTermDocTemplate)));

				txTermDoc.text = country;
				txTermDoc.vocabularyId = txVocId.Country;
				txTermDoc.i18n.en.text = country;
				txTermDoc.createTime = parseInt((Date.now()/1000).toFixed(0));
				txTermDoc.lastUpdateTime = txTermDoc.createTime;

				cltTXTerms.insertOne(txTermDoc,insertOptions)
					.then((r)=>{
						if(1 === r.result.ok){
							debugDev('Insert taxonomy Country - term - ' + country + ' - Succeeded!!');
							countryInsertLog += 'Insert taxonomy Country - term - ' + country + ' - Succeeded!!' + '\n';
							wait4CountryInsertionEnd();						
						}
					})
					.catch((e)=>{
						console.log('Insert taxonomy Country - term - ' + country + ' -  Exception Error Happened!! - ' + e);
						countryInsertLog += 'Insert taxonomy Country - term - ' + country + ' -  Exception Error Happened!! - ' + e + '\n';
						wait4CountryInsertionEnd();
					});

			});

		} else {
			wait4AllInsertionEnd();
		}	

		if(stateToBeInserted.length){
			console.log('TX State / Province Insertion Starts......');

			var stateInsertCount = stateToBeInserted.length;
			var wait4StateInsertionEnd = () => {
				stateInsertCount--;
				if(!stateInsertCount){
					wait4AllInsertionEnd();
				}
			};


			stateToBeInserted.forEach((state)=>{
				var txTermDoc = (JSON.parse(JSON.stringify(txTermDocTemplate)));

				txTermDoc.text = state;
				txTermDoc.vocabularyId = txVocId['State/Province'];
				txTermDoc.i18n.en.text = state;
				txTermDoc.createTime = parseInt((Date.now()/1000).toFixed(0));
				txTermDoc.lastUpdateTime = txTermDoc.createTime;

				cltTXTerms.insertOne(txTermDoc,insertOptions)
					.then((r)=>{
						if(1 === r.result.ok){
							debugDev('Insert taxonomy State / Province - term - ' + state + ' - Succeeded!!');
							stateInsertLog += 'Insert taxonomy State / Province - term - ' + state + ' - Succeeded!!' + '\n';
							wait4StateInsertionEnd();						
						}
					})
					.catch((e)=>{
						console.log('Insert taxonomy State / Province - term - ' + state + ' -  Exception Error Happened!! - ' + e);
						stateInsertLog += 'Insert taxonomy State / Province - term - ' + state + ' -  Exception Error Happened!! - ' + e + '\n';
						wait4StateInsertionEnd();
					});

			});

		} else {
			wait4AllInsertionEnd();
		}	
	}

	var endProgram = ()=>{
		db.close();
		console.log('*** updateTXTerms.js Finished!! ***');
	}

	// Starting point
	preparingData();
});