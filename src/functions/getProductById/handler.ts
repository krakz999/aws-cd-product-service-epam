import { getProductById } from "../../mocks/products";

export default async function (event: any): Promise<any> {
  const { id } = event;
  const product = await getProductById(id);

  if (!product) {
    throw new Error(`NotFound`);
  }

  return product;
}
