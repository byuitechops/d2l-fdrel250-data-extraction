const puppeteer = require('puppeteer');
const pmap = require('p-map');
const {
    sortSection,
    sortSemesters
} = require('./sort.js');
const chalk = require('chalk');

// This function waits 1000ms to allow the popup to load.
async function timeout() {
    return new Promise(resolve => setTimeout(resolve, 1000));
}

/***********************************************
 * This function scrapes all data from a single
 * student submission popup that contains 
 * "answer" labels instead of "d2l-htmlblock-untrusted"
 * classes
 ***********************************************/
async function scrapeSubmissionDataWithLabels(frame) {
    var data = await frame.$$eval('.d_tl.d_tm.d_tn', items => {
        let tmp = {};
        // set the sis user id
        tmp.sis_user_id = items[0].innerText.split(' ').pop().replace(')', '');
        // set the date stamp
        tmp.date = items[2].innerText.split(' ').slice(1, 4).join(' ');

        return tmp;
    });
    // set the link of this student's submission
    data.link = await frame.url();

    // get divs that have questions
    try {
        var divs = await frame.$$('div[style*="margin-left:0.9em;"]');
        var num = 0; // Question count
        var qAndAs = [];
        for (let div of divs) {
            let questionText = await div.$eval('.drt.d2l-htmlblock.d2l-htmlblock-deferred:not(.d2l-htmlblock-untrusted)', q => q.innerText);
            let answer = await div.$$eval('.d_tl.d_tm.d_tw', ans => {
                let ansObj = { length: ans.length };
                if (ans.length === 2) ansObj.text = ans[0].innerText; // if there are only 2 things with these classes then the answer is ans[0] 
                else if (ans.length > 2) ansObj.options = ans.map(a => a.innerText); // if there are more than it's multiple choice
                return ansObj;
            });
            if (answer.length === 0) {
                answer.text = "- No text entered -"; // otherwise they did not answer
            } else if (answer.length > 2) { // handling for multiple choice question
                let selected = await div.$$eval('.vui-input[type=radio]', inputs => {
                    let index;
                    inputs.forEach((input, i) => {
                        if (input.getAttribute('checked') == 'checked') index = i;
                    });
                    return index;
                });
                if (selected !== undefined) answer.text = answer.options[selected];
                else answer.text = '- No choice selected -';
            }
            qAndAs.push({ name: `Question ${++num}`, text: questionText, response_text: answer.text });
        }
        data.questions = qAndAs;
    } catch (err) {
        data.questions = [];
        console.log(`ERROR SCRAPING SUBMISSION: Answers could not be located for student ${data.sis_user_id}`);
    }
    return data;
}

/***********************************************
 * This function scrapes all data from a single
 * student submission popup.
 ***********************************************/
async function scrapeSubmissionData(frame) {
    var data = await frame.$$eval('.d_tl.d_tm.d_tn', items => {
        let tmp = {};
        // set the sis user id
        tmp.sis_user_id = items[0].innerText.split(' ').pop().replace(')', '');
        // set the date stamp
        tmp.date = items[2].innerText.split(' ').slice(1, 4).join(' ');

        return tmp;
    });
    // set the link of this student's submission
    data.link = await frame.url();

    // get divs that have questions
    try {
        var divs = await frame.$$('div[style*="margin-left:0.9em;"]');
        var num = 0;
        var qAndAs = [];
        for (let div of divs) {
            let questionText = await div.$eval('.drt.d2l-htmlblock.d2l-htmlblock-deferred:not(.d2l-htmlblock-untrusted)', q => q.innerText);
            let answer = await div.$$eval('.drt.d2l-htmlblock.d2l-htmlblock-untrusted', ans => {
                let ansObj = { length: ans.length };
                if (ans.length === 1) ansObj.text = ans[0].innerText;
                else if (ans.length > 1) ansObj.options = ans.map(a => a.innerText);
                return ansObj;
            });
            if (answer.length === 0) {
                answer.text = await div.$eval('.ds_b', no => no.innerText);
            } else if (answer.length > 1) {
                let selected = await div.$$eval('.vui-input[type=radio]', inputs => {
                    let index;
                    inputs.forEach((input, i) => {
                        if (input.getAttribute('checked') == 'checked') index = i;
                    });
                    return index;
                });
                if (selected !== undefined) answer.text = answer.options[selected];
                else answer.text = '- No choice selected -';
            }
            qAndAs.push({ name: `Question ${++num}`, text: questionText, response_text: answer.text });
        }
        data.questions = qAndAs;
    } catch (err) {
        data.questions = [];
        console.log(`ERROR SCRAPING SUBMISSION: Answers could not be located for student ${data.sis_user_id}`);
    }
    return data;
}

/********************************************************************************
 * This function completes all the puppeteer tasks of clicking through the d2l UI.
 *******************************************************************************/
async function clickAndScrape({ submission, page, subLength }, i) {
    console.log(`${i + 1} / ${subLength}`);
    // open the popup
    const [popup] = await Promise.all([
        new Promise(resolve => page.once('popup', resolve)),
        submission.hover(),
        submission.click()
    ]);
    let data;
    try {
        /* Wait for popup and select most recent attempt */
        await popup.waitForFunction(() => {
            var frame = document.querySelector('frameset frame[title=Body]')
            if (frame === null)
                return false;
            return frame.contentDocument.querySelector('select[name=attempt]') !== null;
        });
        var frameset = await popup.frames()['0'];
        var childFrames = await frameset.childFrames();
        var frame = childFrames.find(f => f.name() === "Body");
        var attempt = await frame.$$eval('select[name=attempt] option', e => {
            let value;
            e.reduce((accum, opt) => {
                if (opt.innerText.slice(0, 7).toUpperCase() === 'ATTEMPT' && Number(opt.innerText.slice(-1)) > Number(accum.innerText.slice(-1))) {
                    value = opt.value;
                    return opt;
                }
                return accum;
            }, { innerText: '0' });
            return value;
        });
        // wait for popup to load then select generic
        await timeout();
        await frame.select('select[name=attempt]', '0');
        // wait for reload then select most recent attempt
        await timeout();
        await frame.select('select[name=attempt]', attempt);

        /* scrape data from popup and return student's Q&As. Use either w/ labels or w/o labels depending on course. */
        await timeout();
        data = await scrapeSubmissionData(frame);
        // data = await scrapeSubmissionDataWithLabels(frame);
        var title = await page.$eval("a[title*=FDREL]", course => {
            var code = course.getAttribute('href').split('/').pop();
            var semester = course.innerText.split('; ').pop();
            var sections = course.innerText.split(' ')[2].split(',');
            return { semester, sections, code };
        });
        data.semester = title.semester;
        data.sections = title.sections;
        data.course_id = title.code;
    } catch (error) {
        console.log(`ERROR SCRAPING SUBMISSION: `, error.message);
        data.questions = [];
        console.log(data);
    }
    await popup.close();
    await page.waitForSelector('a[title*=ubmission]');
    return data;
}

/******************************************************************************
 * This function opens a browser instance, logs in to D2L, and then loops
 * through every submission in the given link.
 ******************************************************************************/
async function openLink(link) {
    /* Define the browser */
    const browser = await puppeteer.launch({
        slowMo: 10,
        headless: false,
        defaultViewport: null,
        handleSIGINT: true,
        args: ['--start-maximized']
    });

    /* Navigate to the new blank page that puppeteer opens for us */
    var pages = await browser.pages()
    const page = pages[0];

    /* Navigate to the d2l backdoor login page and wait for it to load */
    await page.goto('https://byui.brightspace.com/d2l/login?noredirect=true');
    await page.waitFor('.d2l-login-portal-login.d2l-login-portal-bordered');

    /* Type in my username and password, which are set as environment varaibles within the console */
    await page.type('#userName', process.env.D2L_USERNAME);
    await page.type('#password', process.env.D2L_PASSWORD);

    /* Click the login button and wait for the next page to load */
    await page.evaluate(() => {
        document.querySelector('.d2l-button').click();
    })
    await page.waitForSelector('.d2l-navigation-s-group-text');

    /* Go to the quiz page (link is the one passed into the function) and wait for it to load */
    await page.goto(link);
    await page.waitForSelector('.d2l-select[title*=Results]');

    var data = [];
    try {
        var currentData = [];
        var nextPage = await page.$('a[title*="Next Page"]');
        do {
            var submissions = await page.$$('a[title*=ubmission]');
            await page.$eval('d2l-floating-buttons', container => {
                container.parentNode.removeChild(container);
            });
            submissions = submissions.map(submission => { return { submission, page, subLength: submissions.length }; });
            // if (submissions.length >= 10) submissions = submissions.slice(Math.floor(submissions.length * .99));
            currentData = await pmap(submissions, clickAndScrape, { concurrency: 1 });
            data = data.concat(currentData);
            nextPage = await page.$('a[title*="Next Page"]');
            if (nextPage !== null) {
                await Promise.all([
                    page.waitForNavigation(),
                    nextPage.click()
                ]);
            }
        } while (nextPage !== null);

        // console.dir(data, { depth: 4 });
    } catch (error) {
        console.log(chalk.red(`ERROR READING SUBMISSIONS: ${error}`));
    }
    await browser.close();
    return data;
}


module.exports = {
    async main({ link, length }, i) {
        console.log(chalk.green(`Opening link ${i + 1} out of ${length}.`));
        console.log(link);
        // open link
        var data = await openLink(link);
        if (data.length === 0) {
            console.log(chalk.red(`ERROR: Link contained no submissions or scraping did not complete correctly.`));
            return data;
        }
        // sort returned data
        var sortedData = sortSection(data);
        // console.dir(sortedData, { depth: 4 });
        return sortedData;
    }
};