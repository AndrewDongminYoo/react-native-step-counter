#!/usr/bin/env node
const { sync: deleteSync } = require('del');

const patterns = [
  '!**/node_modules',
  'example/android/.gradle',
  'android/.gradle',
  'example/(android|ios)/**/build',
  'example/android/app/.cxx',
  'example/android/app/(release|debug)',
  'example/(android|ios)/**/main.jsbundle',
  'example/ios/DerivedData',
  'example/ios/Pods',
];

const options = {
  force: true,
  dryRun: true,
  onProgress(progress) {
    const { deletedFiles, totalFiles, percent } = progress;
    const deleteFileCount = deletedFiles.toLocaleString();
    const totalFileCount = totalFiles.toLocaleString();
    const percentComplete = (percent * 100).toFixed(1);
    console.log(
      `${deleteFileCount}/${totalFileCount} files deleted (${percentComplete} %)`
    );
  },
};

deleteSync(patterns, options);
