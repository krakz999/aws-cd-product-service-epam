import { SQSEvent } from "aws-lambda";
import { ProductRepository } from "../../repositories/product-repository";
import { StockRepository } from "../../repositories/stock-repository";
import {
  ProductService,
  CreateProductInput,
} from "../../services/product-service";

const productRepository = new ProductRepository();
const stockRepository = new StockRepository();
const productService = new ProductService(productRepository, stockRepository);

export default async function (event: SQSEvent) {
  console.log("catalogBatchProcess", event);
  console.log(`Processing ${event.Records.length} messages`);

  const results = [];
  const errors = [];

  for (const record of event.Records) {
    try {
      console.log("Processing message:", record.body);

      const productData: CreateProductInput = JSON.parse(record.body);

      const createdProduct = await productService.createProductFromInput(
        productData
      );

      console.log("Successfully created product:", createdProduct);
      results.push(createdProduct);
    } catch (error) {
      console.error("Error processing message:", record.body, error);
      errors.push({
        messageId: record.messageId,
        body: record.body,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(
    `Batch processing completed. Success: ${results.length}, Errors: ${errors.length}`
  );

  if (errors.length > 0) {
    console.error("Errors encountered:", errors);
  }

  return {
    processedCount: results.length,
    errorCount: errors.length,
    results,
    errors,
  };
}
