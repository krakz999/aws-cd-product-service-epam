#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ProductServiceStack } from "../lib/product-service-stack";
import { ImportServiceStack } from "../lib/import-service-stack";
import { AuthorizationServiceStack } from "../lib/authorization-service-stack";
import "dotenv/config";

const app = new cdk.App();

new AuthorizationServiceStack(app, "AuthorizationServiceStack", {});

const productServiceStack = new ProductServiceStack(
  app,
  "ProductServiceStack",
  {}
);

new ImportServiceStack(app, "ImportServiceStack", {
  catalogItemsQueue: productServiceStack.catalogItemsQueue,
});
