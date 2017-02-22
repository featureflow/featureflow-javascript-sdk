#!/usr/bin/env bash
#DEFAULT="default"
#PROFILE=${AWS_PROFILE:-$DEFAULT}
#BUCKET=site-staging
#DIR=./dist
#aws s3 sync $DIR s3://$BUCKET/
aws s3 cp dist/featureflow.js s3://cdn.featureflow.io/featureflow.js
aws s3 cp dist/featureflow.min.js s3://cdn.featureflow.io/featureflow.min.js
