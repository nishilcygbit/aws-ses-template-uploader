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
  const allFiles = fs.readdirSync(templatesDir);
  core.notice(`Found ${allFiles.length} files in the directory`);

  const filesChunks = [];
  for (let i = 0; i < allFiles.length; i += 20) {
    filesChunks.push(allFiles.slice(i, i + 20));
  }
  core.notice(`Split the files into ${filesChunks.length} chunks`);

  for (const fileChunk of filesChunks) {
    core.notice(`Processing the next batch of files - ${fileChunk.length}`);

    for (const name of fileChunk) {
      // Use for...of for async/await inside loop
      const path = `${templatesDir}/${name}`;
      core.notice(`Processing file - ${path}`);

      if (fs.lstatSync(path).isDirectory()) {
        readFiles(path);
        continue; // Use continue to skip to the next file
      }

      const file = JSON.parse(fs.readFileSync(path));
      const templateName = `${prefix}${file.Template.TemplateName}`;

      try {
        await client.send(
          new GetTemplateCommand({ TemplateName: templateName })
        );
        // Template exists, update it
        try {
          await client.send(
            new UpdateTemplateCommand({
              Template: { ...file.Template, TemplateName: templateName },
            })
          );
          core.notice(`Updated template: ${templateName} (${name})`);
        } catch (error) {
          core.setFailed(error.message);
        }
      } catch (error) {
        // Catch the GetTemplateCommand error
        // Template doesn't exist, create it
        try {
          await client.send(
            new CreateTemplateCommand({
              Template: { ...file.Template, TemplateName: templateName },
            })
          );
          core.notice(`Created template: ${templateName} (${name})`);
        } catch (createError) {
          core.setFailed(createError.message);
        }
      }
      core.notice(`Finished Processing file - ${path}`);

      core.notice("Waiting for 1 second before processing the next file");
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

run();
