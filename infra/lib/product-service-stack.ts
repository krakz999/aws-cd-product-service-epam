import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from "path";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { fileURLToPath } from "url";

export class ProductServiceStack extends cdk.Stack {
  private productTable: dynamodb.Table;
  private stockTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create tables
    this.productTable = new dynamodb.Table(this, "Products", {
      tableName: "Products",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    });

    this.stockTable = new dynamodb.Table(this, "Stock", {
      tableName: "Stock",
      partitionKey: { name: "product_id", type: dynamodb.AttributeType.STRING },
    });

    const api = new apigateway.RestApi(this, "ProductServiceApi", {
      restApiName: "Product Service API",
      description: "This API serves the Product Service.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET"],
      },
    });

    // Create lambdas
    const getProductsLambda = this.createLambda("getProducts");
    this.productTable.grantReadData(getProductsLambda);
    this.stockTable.grantReadData(getProductsLambda);

    const getProductByIdLambda = this.createLambda("getProductById");
    this.productTable.grantReadData(getProductByIdLambda);
    this.stockTable.grantReadData(getProductByIdLambda);

    const createProductLambda = this.createLambda("createProduct");
    this.productTable.grantWriteData(createProductLambda);
    this.stockTable.grantWriteData(createProductLambda);

    // Create integrations
    const getProductsLambdaIntegration = new apigateway.LambdaIntegration(
      getProductsLambda,
      {
        proxy: false,
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": `$input.json('$')`,
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
        ],
      }
    );

    const getProductByIdLambdaIntegration = new apigateway.LambdaIntegration(
      getProductByIdLambda,
      {
        proxy: false,
        requestTemplates: {
          "application/json": `{"id": "$input.params('id')"}`,
        },
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": `$input.json('$')`,
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
          {
            statusCode: "404",
            selectionPattern: ".*[Not Found].*",
            responseTemplates: {
              "application/json": `{"message": "Resource not found"}`,
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
        ],
      }
    );

    const createProductLambdaIntegration = new apigateway.LambdaIntegration(
      createProductLambda,
      {
        proxy: false,
        requestTemplates: {
          "application/json": `{
            "title": "$input.path('$.title')",
            "description": "$input.path('$.description')",
            "price": "$input.path('$.price')"
          }`,
        },
        integrationResponses: [
          {
            statusCode: "201",
            responseTemplates: {
              "application/json": `$input.json('$')`,
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
          {
            statusCode: "400",
            selectionPattern: ".*[Bad Request].*",
            responseTemplates: {
              "application/json": `{"message": "Invalid request body"}`,
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
        ],
      }
    );

    // Create resources
    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", getProductsLambdaIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    productsResource.addMethod("POST", createProductLambdaIntegration, {
      methodResponses: [
        {
          statusCode: "201",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "400",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    const productByIdResource = productsResource.addResource("{id}");
    productByIdResource.addMethod("GET", getProductByIdLambdaIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "404",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });
  }

  private createLambda(name: string): lambda.Function {
    return new lambda.Function(this, name, {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: `${name}/index.default`,
      code: lambda.Code.fromAsset(
        path.join(path.dirname(fileURLToPath(import.meta.url)), "../resources")
      ),
      environment: {
        PRODUCTS_TABLE_NAME: this.productTable.tableName,
        STOCK_TABLE_NAME: this.stockTable.tableName,
      },
    });
  }
}
