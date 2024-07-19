const log = require('../config/config.js').getLog();
require('colors');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;

process.env.TEST_OUTPUT_FILE_FOLDER = './scratch/test-out/test-io-files';
fs.mkdirSync(process.env.TEST_OUTPUT_FILE_FOLDER, { recursive: true });
process.env.XML_FILE_FOLDER = './src/test/xml_output';
if(fs.existsSync(process.env.XML_FILE_FOLDER))
    fs.rmSync(process.env.XML_FILE_FOLDER, { recursive: true });

(async () => {
    let count = 0;
    let passed = [];
    let failed = [];
    let skipped = [];
    await Promise.all(fs.readdirSync(__dirname)
        .filter((fileName) => fileName != path.basename(__filename) && fileName.includes('.js') && fileName.includes('test'))
        .map(async fileName => {
            const testName = fileName;
            let testModule;
            try {
                testModule = require(`./${fileName}`);
            } catch (err) {
                count++;
                log.error({error: err}, `Test '${testName}' failed to import.`.red, err);
                failed.push(testName);
                return;
            }
            if (testModule.skip === true || argv?.skip?.includes(fileName)) {
                count++;
                log.test(`Test module '${testName}' skipped.`.yellow);
                skipped.push(testName);
                return;
            }
            if (typeof testModule === 'function')
                try {
                    count++;
                    await testModule();
                    log.test(`Test '${testName}' passed.`.green);
                    passed.push(testName);
                } catch (err) {
                    log.error({error: err}, `Test '${testName}' failed.`.red, err);
                    failed.push(testName);
                }
            for (const test in testModule)
                if (typeof testModule[test] === 'function') {
                    count++;
                    if (testModule[test].skip !== true && !argv?.skip?.includes(testModule[test]) && !argv?.skip?.includes(fileName + '/' + test)) {
                        try {
                            await testModule[test]();
                            log.test(`Test '${testName}/${test}' passed.`.green);
                            passed.push(testName+'/'+test);
                        } catch (err) {
                            log.error({err: err}, `Test '${testName}/${test}' failed.`.red);
                            failed.push(testName+'/'+test);
                        }
                    } else {
                        log.test(`Test '${testName}/${test}' skipped.`.yellow);
                        skipped.push(testName+'/'+test);
                    }
                }
            return 1;
        })
    );

    let msg = `\nTotal tests: ${count}\n`.bold.white;
    if (failed.length == 0) {
        msg += 'All tests passed.\n'.green;
    } else {
        msg += 'Some tests failed.\n'.red;
        msg += `  failed: ${failed.length}\n(${failed})\n`.red;
    }
    msg += `  passed: ${passed.length}\n(${passed})\n`.green;
    if (skipped.length > 0)
        msg += `  skipped: ${skipped.length}\n(${skipped})\n`.yellow;
    if(fs.existsSync(process.env.XML_FILE_FOLDER))
        fs.rmSync(process.env.XML_FILE_FOLDER, { recursive: true });
    if (failed.length > 0) {
        log.error(msg);
        process.exit(1);
    } else {
        log.test(msg);
    }
})();