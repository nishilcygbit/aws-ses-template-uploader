const core = require('@actions/core');
const { 
    SESClient,
    UpdateTemplateCommand,
    CreateTemplateCommand,
    GetTemplateCommand
} = require('@aws-sdk/client-ses');
const fs = require('fs');

async function run() {
    try {
        // Grab the templates directory location from the input
        const templatesDir = core.getInput('templates');
        core.notice(`templatesDir: ${templatesDir}`);

        // Grab the prefix from the input
        const prefix = core.getInput('prefix');
        core.notice(`prefix: ${prefix}`);

        // GitHub should validate this because it's required, but just to be safe!
        if (!templatesDir) {
            core.setFailed('no templates directory provided');
            return;
        }

        // Create a new SES Client, taking credentials from aws-actions/configure-aws-credentials
        const client = new SESClient();

        // Parse each file in the directory
        parseFiles(client, templatesDir, prefix);
    } catch (error) {
        core.setFailed(error.message);
    }
}

function parseFiles(client, templatesDir, prefix) {
    // Read each file in the directory
    fs.readdirSync(templatesDir).forEach((name) => {
        const path = `${templatesDir}/${name}`;

        // If it's a directory, read the file within there
        if (fs.lstatSync(path).isDirectory()) {
            readFiles(path);
            return;
        }

        // Parse the JSON from the file
        const file = JSON.parse(fs.readFileSync(path));
        core.notice(`file: ${JSON.stringify(file)}`);

        const templateName = `${prefix}${file.Template.TemplateName}`;
        core.notice(`templateName: ${templateName}`);

        // First, figure out if we have a template
        client.send(new GetTemplateCommand({TemplateName: templateName})).then(() => {
            // We have a template! Update it

            client.send(new UpdateTemplateCommand({
                Template: { ...file.Template, TemplateName: templateName }
            })).then(() => {
                core.notice(`Updated template: ${templateName} (${name})`);
            }).catch((error) => {
                core.setFailed(error.message);
            });
        }).catch(() => {
            client.send(new CreateTemplateCommand({
                Template: { ...file.Template, TemplateName: templateName }
            })).then(() => {
                core.notice(`Created template: ${templateName} (${name})`);
            }).catch((error) => {
                core.setFailed(error.message);
            });
        })
    });
}

run();