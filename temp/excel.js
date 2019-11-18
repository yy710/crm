'use strict';

var XLSX = require('xlsx');
var excel = {};

excel.xlsxToDb = function (xlsxUrl, db, col) {
    var workbook = XLSX.readFile(xlsxUrl);
    workbook.SheetNames.forEach(function (y) { /* iterate through sheets */
        var worksheet = workbook.Sheets[y];
        var j = XLSX.utils.sheet_to_json(worksheet);

        db.collection(col).insertMany(j).then(function (r) {
            console.log('sheet: ', y, ' is inserted to ', col, '!');
            //db.close();
        }).catch(console.log);

        /*
         for (let z in worksheet) {
         // all keys that do not begin with "!" correspond to cell addresses
         if (z[0] === '!') continue;
         console.log(y + "!" + z + "=" + JSON.stringify(worksheet[z].v));
         }
         */
    });
};

excel.xlsxTolog = function (xlsxUrl) {
    var workbook = XLSX.readFile(xlsxUrl);
    workbook.SheetNames.forEach(function (y) { /* iterate through sheets */
        var worksheet = workbook.Sheets[y];
        //var j = XLSX.utils.sheet_to_json(worksheet);

        for (var z in worksheet) {
            // all keys that do not begin with "!" correspond to cell addresses
            if (z[0] === '!') continue;
            console.log(y + "!" + z + "=" + JSON.stringify(worksheet[z].v));
        }
    });
};


module.exports = excel;