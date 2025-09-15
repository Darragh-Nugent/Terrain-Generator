const S3 = require("@aws-sdk/client-s3");

const bucketName = 'n11547227-a2-terrains'
const qut_username = 'n11547227@qut.edu.au'
const qut_username2 = ''
const purpose = 'assessment 2'

async function CreateBucket() {
    // Creating a client for sending commands to S3
    s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

    try {
    // 1. Create the bucket
    const createResp = await s3Client.send(
      new S3.CreateBucketCommand({ Bucket: bucketName })
    );
    console.log("Bucket created:", createResp.Location);

    // 2. Apply tags
    const tagResp = await s3Client.send(
      new S3.PutBucketTaggingCommand({
        Bucket: bucketName,
        Tagging: {
          TagSet: [
            { Key: "qut-username", Value: qut_username },
            { Key: "qut-username2", Value: qut_username2 },
            { Key: "purpose", Value: purpose },
          ],
        },
      })
    );
    console.log("Tags applied:", tagResp);
  } catch (err) {
    if (err.name === "BucketAlreadyOwnedByYou") 
      console.log(`Bucket ${bucketName} already exists (owned by you).`);
    
    else
        console.error("Error:", err);
  }
}

(async () => {
    await CreateBucket();
    console.log("Script finished");
})();