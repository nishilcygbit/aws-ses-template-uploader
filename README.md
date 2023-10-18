# SES Template Uploader javascript action

This action uploads all SES tempaltes inside the input `template` directory

## Inputs

### `template`

**Required** The directory where templates reside

### `prefix`

**Optional** The prefix to be used to create/update template names. This can be used to create separate templates for dev/staging/prod etc.

## Example usage

```yaml
uses: actions/aws-ses-template-uploader
with:
  template: 'templates'
  prefix: 'dev'
```

# Inspiration

This actions plugin is extension of [action-aws-ses-template-uploader](https://github.com/managemy-lease/action-aws-ses-template-uploader). It only adds an extra attribute 
