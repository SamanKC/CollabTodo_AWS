import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface ApiStackProps extends cdk.StackProps {
  userPool: cognito.IUserPool; // from AuthStack
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigw.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Common X-Ray policy
    const xrayPolicy = new iam.PolicyStatement({
      actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
      resources: ['*'],
    });

    // Ping Lambda (public) with CORS
    const pingFn = new lambda.Function(this, 'PingFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const ALLOW_ORIGINS = ["http://localhost:5173","https://${process.env.CF_DOMAIN ?? "<cloudfront-domain>"}"];
        const cors = (origin) => {
          const allowed = ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
          return {
            "access-control-allow-origin": allowed,
            "access-control-allow-headers": "Authorization,Content-Type",
            "access-control-allow-methods": "GET,POST,OPTIONS",
            "vary": "Origin"
          };
        };
        exports.handler = async (event) => {
          const origin = event.headers?.origin || event.headers?.Origin || "";
          return { statusCode: 200, headers: cors(origin), body: "pong" };
        }
      `),
      tracing: lambda.Tracing.ACTIVE,
    });
    pingFn.addToRolePolicy(xrayPolicy);

    // Me Lambda (protected) with CORS
    const meFn = new lambda.Function(this, 'MeFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const ALLOW_ORIGINS = ["http://localhost:5173","https://${process.env.CF_DOMAIN ?? "<cloudfront-domain>"}"];
        const cors = (origin) => {
          const allowed = ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
          return {
            "content-type": "application/json",
            "access-control-allow-origin": allowed,
            "access-control-allow-headers": "Authorization,Content-Type",
            "access-control-allow-methods": "GET,POST,OPTIONS",
            "vary": "Origin"
          };
        };
        exports.handler = async (event) => {
          const origin = event.headers?.origin || event.headers?.Origin || "";
          const claims =
            (event.requestContext?.authorizer?.claims) ||
            (event.requestContext?.authorizer?.jwt?.claims) ||
            {};
          const body = {
            userId: claims.sub || null,
            email: claims.email || null,
            issuer: claims.iss || null
          };
          return { statusCode: 200, headers: cors(origin), body: JSON.stringify(body) };
        }
      `),
      tracing: lambda.Tracing.ACTIVE,
    });
    meFn.addToRolePolicy(xrayPolicy);

    // API Gateway
    this.api = new apigw.RestApi(this, 'TodoApi', {
      restApiName: 'CollabTodo Service',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'http://localhost:5173',
          'https://<cloudfront-domain>'
        ],
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET','POST','PATCH','DELETE','OPTIONS'],
      },
    });

    // Cognito authorizer
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'CollabTodoCognitoAuth',
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    // Routes
    const ping = this.api.root.addResource('ping');
    ping.addMethod('GET', new apigw.LambdaIntegration(pingFn), {
      authorizationType: apigw.AuthorizationType.NONE,
    });

    const v1 = this.api.root.addResource('v1');
    const me = v1.addResource('me');
    me.addMethod('GET', new apigw.LambdaIntegration(meFn), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiBaseUrl', { value: this.api.url ?? '' });
    new cdk.CfnOutput(this, 'MeEndpoint', { value: (this.api.url ?? '') + 'v1/me' });
    new cdk.CfnOutput(this, 'PingEndpoint', { value: (this.api.url ?? '') + 'ping' });
  }
}
