const core = require("@actions/core");
const {
  SESClient,
  UpdateTemplateCommand,
  CreateTemplateCommand,
  GetTemplateCommand,
} = require("@aws-sdk/client-ses");
const fs = require("fs");

async function run() {
  try {
    // Grab the templates directory location from the input
    const templatesDir = core.getInput("templates");

    // Grab the prefix from the input
    const prefix = core.getInput("prefix");

    // GitHub should validate this because it's required, but just to be safe!
    if (!templatesDir) {
      core.setFailed("no templates directory provided");
      return;
    }

    // Create a new SES Client, taking credentials from aws-actions/configure-aws-credentials
    const client = new SESClient();

    // Parse each file in the directory
    await parseFiles(client, templatesDir, prefix);
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function parseFiles(client, templatesDir, prefix) {
  // Read each file in the directory
  // Make this work such that after every 20th file there is a delay of 5 seconds and then resumes reading the files
  const allFiles = fs.readdirSync(templatesDir);
  // Next split the files into chunks of 20
  const filesChunks = [];
  for (let i = 0; i < allFiles.length; i += 20) {
    filesChunks.push(allFiles.slice(i, i + 20));
  }
  for (const fileChunk of filesChunks) {
    fileChunk.forEach(async (name, index) => {
      const path = `${templatesDir}/${name}`;

      // If it's a directory, read the file within there
      if (fs.lstatSync(path).isDirectory()) {
        readFiles(path);
        return;
      }

      // Parse the JSON from the file
      const file = JSON.parse(fs.readFileSync(path));

      const templateName = `${prefix}${file.Template.TemplateName}`;

      // First, figure out if we have a template
      await client
        .send(new GetTemplateCommand({ TemplateName: templateName }))
        .then(async () => {
          // We have a template! Update it

          await client
            .send(
              new UpdateTemplateCommand({
                Template: { ...file.Template, TemplateName: templateName },
              })
            )
            .then(() => {
              core.notice(`Updated template: ${templateName} (${name})`);
            })
            .catch((error) => {
              core.setFailed(error.message);
            });
        })
        .catch(async () => {
          await client
            .send(
              new CreateTemplateCommand({
                Template: { ...file.Template, TemplateName: templateName },
              })
            )
            .then(() => {
              core.notice(`Created template: ${templateName} (${name})`);
            })
            .catch((error) => {
              core.setFailed(error.message);
            });
        });
    });
    await new Promise((r) => setTimeout(r, 2000));
  }
}

run();
