#!/usr/bin/env bash
#DEFAULT="default"
#PROFILE=${AWS_PROFILE:-$DEFAULT}
#BUCKET=site-staging
#DIR=./dist
#aws s3 sync $DIR s3://$BUCKET/

PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

aws s3 cp dist/featureflow.js s3://cdn.featureflow.io/featureflow.js
aws s3 cp dist/featureflow.min.js s3://cdn.featureflow.io/featureflow.min.js
aws s3 cp dist/featureflow.js s3://cdn.featureflow.io/v$PACKAGE_VERSION/featureflow.js
aws s3 cp dist/featureflow.min.js s3://cdn.featureflow.io/v$PACKAGE_VERSION/featureflow.min.js