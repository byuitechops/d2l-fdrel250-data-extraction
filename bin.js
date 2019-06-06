const { main } = require('./main.js');
const pmap = require('p-map');
const fs = require('fs');
const path = require('path');
const {
    sortSection,
    sortSemesters
} = require('./sort.js');

async function getInput() {
    // var input = ['https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1745428&ou=288274',]
    var input = ['https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1750705&ou=290362'];

    // var input = ['https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1745428&ou=288274',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1750705&ou=290362',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1738936&ou=326763',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1737441&ou=327760',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1739166&ou=341283',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1836945&ou=365243',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1881080&ou=375413',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1881154&ou=375417',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1881275&ou=376061',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1949190&ou=388402',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1956053&ou=389359',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1983807&ou=394370',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2061724&ou=412335',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2061755&ou=412339',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2077072&ou=417283',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2116011&ou=425434',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2130217&ou=428547',
    // 'https://byui.brightspace.com/d2l/lms/grades/admin/enter/user_list_view.d2l?ou=469776'];

    return input;
}

async function loop(links) {
    var output = await pmap(links, main, { concurrency: 1 });
    return output;
}

function writeOutput(output) {
    fs.writeFileSync(path.resolve('./output/report.json'), JSON.stringify(output, null, 2), 'utf-8');
}

function handleError(error) {
    console.error(error)
    return;
}

async function start() {
    getInput()
        .then(loop)
        .then(sortSemesters)
        .then(writeOutput)
        .catch(handleError);
}

start();