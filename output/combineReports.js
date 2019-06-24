const fs = require('fs');
const path = require('path');
const { sortSection, sortSemesters } = require(path.resolve('../sort.js'));

function main() {
    var data = require(path.resolve('report1-15.json'));
    var nextData = require(path.resolve('report.json'));
    data = data.concat(nextData);
    var sortedData = sortSemesters(data);
    console.log(data.length);
    console.log(sortedData.length);
    fs.writeFileSync('./newReport.json', JSON.stringify(sortedData, null, 2), 'utf-8');
}

main();