export const SHOP_QUERY = /* GraphQL */ `
  query ShopStatus {
    shop {
      name
      myshopifyDomain
    }
  }
`;

export const PRODUCT_CREATE_MUTATION = /* GraphQL */ `
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        variants(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_UPDATE_MUTATION = /* GraphQL */ `
  mutation ProductUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        variants(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_VARIANTS_BULK_UPDATE_MUTATION = /* GraphQL */ `
  mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const STAGED_UPLOADS_CREATE_MUTATION = /* GraphQL */ `
  mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_CREATE_MEDIA_MUTATION = /* GraphQL */ `
  mutation ProductCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        alt
        mediaContentType
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;
