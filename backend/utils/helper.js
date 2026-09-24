const getPublicId = (url) => {
  const parts = url.split("/");
  const fileName = parts.pop(); // abc123.png
  const folder = parts.slice(parts.indexOf("upload") + 2).join("/"); 
  const publicId = `${folder}/${fileName.split(".")[0]}`;
  return publicId;
};


module.exports = getPublicId;