export const assessmentDerivedData = {
  "confirmedObject": {
    "partIds": [
      "DEBY_LOD2_6944727",
      "DEBY_LOD2_6945465"
    ],
    "combinedGroundAreaM2": 306.23,
    "combinedRoofAreaM2": 414.97,
    "combinedWallAreaM2": 618.47,
    "bboxUtm32": {
      "minE": 748167.041,
      "maxE": 748186.943,
      "minN": 5484444.248,
      "maxN": 5484476.342,
      "minZ": 517.64,
      "maxZ": 519.85
    },
    "principalAxisAzimuthDeg": 18.5,
    "parts": [
      {
        "id": "DEBY_LOD2_6944727",
        "measuredHeightM": 9.39,
        "groundAreaM2": 177.96,
        "roofAreaM2": 256.71,
        "wallAreaM2": 410.81,
        "roofSurfaceCount": 3,
        "wallSurfaceCount": 18,
        "groundElevationM": 517.64,
        "minSurfaceElevationM": 517.64,
        "maxSurfaceElevationM": 527.03,
        "bboxUtm32": {
          "minE": 748167.041,
          "maxE": 748184.924,
          "minN": 5484444.248,
          "maxN": 5484466.478,
          "minZ": 517.64,
          "maxZ": 517.64
        },
        "principalAxisAzimuthDeg": 26.4,
        "averageRoofPitchDeg": 41.3
      },
      {
        "id": "DEBY_LOD2_6945465",
        "measuredHeightM": 7.35,
        "groundAreaM2": 128.27,
        "roofAreaM2": 158.26,
        "wallAreaM2": 207.66,
        "roofSurfaceCount": 4,
        "wallSurfaceCount": 12,
        "groundElevationM": 519.85,
        "minSurfaceElevationM": 519.85,
        "maxSurfaceElevationM": 527.2,
        "bboxUtm32": {
          "minE": 748172.659,
          "maxE": 748186.943,
          "minN": 5484460.713,
          "maxN": 5484476.342,
          "minZ": 519.85,
          "maxZ": 519.85
        },
        "principalAxisAzimuthDeg": 45.5,
        "averageRoofPitchDeg": 39.5
      }
    ],
    "futureRoofNote": "Current metrics describe existing LoD2 evidence geometry. Future unified roof geometry is a later planning variant."
  },
  "terrain": {
    "confirmedObject": {
      "sourceTile": "748_5484.tif",
      "sampleWindowUtm32": {
        "minE": 748147,
        "maxE": 748207,
        "minN": 5484424,
        "maxN": 5484496
      },
      "sampleCount": 4453,
      "minElevationM": 514.72,
      "maxElevationM": 523.57,
      "meanElevationM": 519.6,
      "reliefM": 8.85,
      "approxSlopePercent": 8.01,
      "approxDrainageAzimuthDeg": 180.9
    },
    "activeContext": {
      "sourceTile": "748_5484.tif",
      "sampleWindowUtm32": {
        "minE": 748116,
        "maxE": 748227,
        "minN": 5484379,
        "maxN": 5484507
      },
      "sampleCount": 3640,
      "minElevationM": 512.66,
      "maxElevationM": 524.27,
      "meanElevationM": 519.0,
      "reliefM": 11.61,
      "approxSlopePercent": 5.67,
      "approxDrainageAzimuthDeg": 196.2
    }
  }
};

export type AssessmentDerivedData = typeof assessmentDerivedData;
