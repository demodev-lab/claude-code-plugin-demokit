const path = require('path');
const { io } = require('../core');

function getArtifactDir(projectRoot, featureSlug) {
  return path.join(projectRoot, '.demodev', featureSlug);
}

function saveArtifacts(projectRoot, featureSlug, artifacts) {
  const dir = getArtifactDir(projectRoot, featureSlug);
  io.ensureDir(dir);
  io.writeFile(path.join(dir, 'PRD.md'), artifacts.prd);
  io.writeFile(path.join(dir, 'DESIGN.md'), artifacts.design);
  io.writeFile(path.join(dir, 'TASKS.md'), artifacts.tasks);
  io.writeFile(path.join(dir, 'TASKS.yaml'), artifacts.tasksYaml);
}

function loadArtifacts(projectRoot, featureSlug) {
  const dir = getArtifactDir(projectRoot, featureSlug);
  return {
    prd: io.readFile(path.join(dir, 'PRD.md')),
    design: io.readFile(path.join(dir, 'DESIGN.md')),
    tasks: io.readFile(path.join(dir, 'TASKS.md')),
    tasksYaml: io.readFile(path.join(dir, 'TASKS.yaml')),
  };
}

module.exports = { getArtifactDir, saveArtifacts, loadArtifacts };
