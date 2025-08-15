var moment = require('moment');
function timeNow() {
	return moment().format("YYYY-MM-DD HH:mm:ss");
}
function generateRandomString(length) {
	var result           = '';
	var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for ( var i = 0; i < length; i++ ) {
	   result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}
function generateRandomNumber(length) {
	var result           = '';
	var characters       = '0123456789';
	var charactersLength = characters.length;
	for ( var i = 0; i < length; i++ ) {
	   result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}
// function getLoggerObject(){
// 	var log4js = require('log4js');
// 	var moment = require('moment');
// 	var filename = 'logs/log_'+moment().format('YYYY-MM-DD')+'.log';
// 	log4js.configure({
//   		appenders: { appendfile: { type: 'file', filename: filename } },
//   		categories: { default: { appenders: ['appendfile'], level: 'error' } }
// 	});	
// 	var logger = log4js.getLogger();
// 	return logger	
// }

// function getLoggerObjectServerSideforBills(data){
// 	var log4js = require('log4js');
// 	var moment = require('moment');
// 	var timestamp = moment().unix();
// 	var filename = 'logs/hims_bills_api/log_'+moment().format('YYYY-MM-DD')+'.log';
// 	log4js.configure({
//   		appenders: { appendfile: { type: 'file', filename: filename } },
//   		categories: { default: { appenders: ['appendfile'], level: 'error' } }
// 	});	
// 	var logger = log4js.getLogger();
// 	let logdata = JSON.stringify(data);
//     logger.level = 'debug'; // default level is OFF - which means no logs at all.
//     return logger.debug(logdata);
// }

function isEmpty(data) {
	if (data !== '' && data !== undefined && data !== null && data !== 'null') {
		return false;
	}
	return true;
}

module.exports={
    generateRandomString,
	generateRandomNumber,	
	timeNow,
	// getLoggerObject,
	// getLoggerObjectServerSideforBills,
	isEmpty
}