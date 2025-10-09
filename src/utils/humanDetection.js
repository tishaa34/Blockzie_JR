// src/utils/humanDetection.js
// 🧠 Human detection utilities extracted from runScript.js
// Includes facial expression ("happy") and pointing direction detection.

//
// Detect if the current dominant expression is "happy".
//
export const isHappyDetected = () => {
  return window.humanDetectionData?.dominantExpression === "happy";
};

//
// Detect if a human is pointing in a given direction (up, down, left, right).
//
export const isPointing = (direction) => {
  const { leftHand, rightHand, poses } = window.humanDetectionData || {};

  if (!leftHand || !rightHand || !poses?.[0]?.keypoints) {
    return false;
  }

  const scoreThreshold = 0.2;
  const noseY = poses[0].keypoints[0].position.y;
  const hipY = poses[0].keypoints[11].position.y;
  const leftShoulderX = poses[0].keypoints[5].position.x;
  const rightShoulderX = poses[0].keypoints[6].position.x;

  switch (direction) {
    case "up":
      return (
        (leftHand.score > scoreThreshold && leftHand.position.y < noseY) ||
        (rightHand.score > scoreThreshold && rightHand.position.y < noseY)
      );
    case "down":
      return (
        (leftHand.score > scoreThreshold && leftHand.position.y > hipY) ||
        (rightHand.score > scoreThreshold && rightHand.position.y > hipY)
      );
    case "left":
      return rightHand.score > scoreThreshold &&
        rightHand.position.x < rightShoulderX;
    case "right":
      return leftHand.score > scoreThreshold &&
        leftHand.position.x > leftShoulderX;
    default:
      return false;
  }
};
