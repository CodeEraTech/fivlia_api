// ProductBulkUploadFunctions.js
const Attribute = require("../modals/attribute");
const axios = require("axios");
const AWS = require("aws-sdk");
const pLimit = require("p-limit");
const Category = require("../modals/category");

const limit = pLimit(5);
const s3 = new AWS.S3();

const FALLBACK = "/image/1763450158187-image.png";

exports.FALLBACK = FALLBACK
/* ---------------------------------------------
   IMAGE DOWNLOAD + S3 UPLOAD
---------------------------------------------- */
exports.downloadImageToAWS = (url) =>
  limit(async () => {
    if (!url) return FALLBACK;

    const trimmed = String(url).trim();
    if (!trimmed) return FALLBACK;

    try {
      const response = await axios.get(trimmed, { responseType: "arraybuffer" });

      const buffer = Buffer.from(response.data);
      const fileName = `products/${Date.now()}.jpg`;

      await s3
        .upload({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "image/jpeg",
        })
        .promise();

      return `/${fileName}`;
    } catch (err) {
      console.log("❌ Image download failed:", trimmed);
      return FALLBACK;
    }
  });


/* ---------------------------------------------
   CATEGORY RESOLVER
   Accepts:
      CAT01
      SUB01
      SUBB02
      CAT01/SUB01
      CAT01/SUB01/SUBB02
---------------------------------------------- */
exports.resolveCategory = async function (categoryValue) {
  const result = {
    valid: false,
    categoryArr: [],
    subCategoryArr: [],
    subSubCategoryArr: [],
  };

  if (!categoryValue) return result;

  // Normalize
  const raw = String(categoryValue).trim();
  if (!raw) return result;

  const parts = raw
    .split("/")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);

  if (parts.length === 1) {
    const code = parts[0];

    let catObj = await Category.findOne({ categoryId: code }).lean();
    if (catObj) {
      result.categoryArr = [{ _id: catObj._id, name: catObj.name }];
      result.valid = true;
      return result;
    }

    // SUBCATEGORY LEVEL
    let catObj2 = await Category.findOne({ "subcat.subCategoryId": code }).lean();
    if (catObj2) {
      const subObj = catObj2.subcat.find(
        (s) => s.subCategoryId.toUpperCase() === code
      );

      result.categoryArr = [{ _id: catObj2._id, name: catObj2.name }];
      result.subCategoryArr = [{ _id: subObj._id, name: subObj.name }];
      result.valid = true;
      return result;
    }

    // SUB-SUB CATEGORY LEVEL
    let catObj3 = await Category.findOne({
      "subcat.subsubcat.subSubCategoryId": code,
    }).lean();

    if (catObj3) {
      let foundSub = null;
      let foundSubSub = null;

      for (const sc of catObj3.subcat) {
        const ss = (sc.subsubcat || []).find(
          (x) => x.subSubCategoryId.toUpperCase() === code
        );
        if (ss) {
          foundSub = sc;
          foundSubSub = ss;
          break;
        }
      }

      if (foundSub && foundSubSub) {
        result.categoryArr = [{ _id: catObj3._id, name: catObj3.name }];
        result.subCategoryArr = [{ _id: foundSub._id, name: foundSub.name }];
        result.subSubCategoryArr = [
          { _id: foundSubSub._id, name: foundSubSub.name },
        ];
        result.valid = true;
      }

      return result;
    }

    return result;
  }

  // -----------------------------------------
  // CASE 2: CHAIN (CAT01/SUB01 or CAT01/SUB01/SUBB02)
  // -----------------------------------------
  const [catCode, subCode, subSubCode] = parts;

  // Find category
  const catObj = await Category.findOne({ categoryId: catCode }).lean();
  if (!catObj) return result;

  result.categoryArr = [{ _id: catObj._id, name: catObj.name }];

  // If chain includes subcategory
  if (subCode) {
    const subObj = (catObj.subcat || []).find(
      (s) => s.subCategoryId.toUpperCase() === subCode
    );
    if (!subObj) return result;

    result.subCategoryArr = [{ _id: subObj._id, name: subObj.name }];

    // If chain also includes sub-sub-category
    if (subSubCode) {
      const subSubObj = (subObj.subsubcat || []).find(
        (x) => x.subSubCategoryId.toUpperCase() === subSubCode
      );
      if (!subSubObj) return result;

      result.subSubCategoryArr = [
        { _id: subSubObj._id, name: subSubObj.name },
      ];
    }
  }

  result.valid = true;
  return result;
};

exports.buildLocationArray = function (zoneData) {
  return zoneData.map(city => ({
    city: [
      { _id: city._id, name: city.city }
    ],
    zone: city.zones.map(z => ({
      _id: z._id,
      name: z.zoneTitle
    }))
  }));
};

exports.resolveVariantSimple = async function (variantId) {
  if (!variantId) return null;

  const code = String(variantId).trim().toUpperCase();
  if (!code) return null;

  // Find Attribute that contains this variant
  const attr = await Attribute.findOne({ "varient.variantId": code }).lean();
  if (!attr) return null;

  const variantObj = attr.varient.find(v => v.variantId.toUpperCase() === code);
  if (!variantObj) return null;

  return {
    attributeName: attr.Attribute_name,
    variantValue: variantObj.name
  };
};
