import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class EdgeStack extends cdk.Stack {
  public readonly spaBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket to host the SPA (no public access)
    this.spaBucket = new s3.Bucket(this, 'SpaBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
    });

    // CloudFront OAI (older but stable across CDK versions)
    const oai = new cloudfront.OriginAccessIdentity(this, 'SpaOAI', {
      comment: 'OAI for SPA bucket',
    });
    this.spaBucket.grantRead(oai);

    // CloudFront distribution with S3 origin
    this.distribution = new cloudfront.Distribution(this, 'SpaDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.spaBucket, { originAccessIdentity: oai }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // keep costs low
    });

    // Minimal placeholder index so you can test CloudFront immediately
    new s3deploy.BucketDeployment(this, 'DeployPlaceholder', {
      sources: [s3deploy.Source.data('index.html', '<!doctype html><h1>CollabTodo coming soon</h1>')],
      destinationBucket: this.spaBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    new cdk.CfnOutput(this, 'SpaBucketName', { value: this.spaBucket.bucketName });
    new cdk.CfnOutput(this, 'CloudFrontDomain', { value: this.distribution.domainName });
  }
}
