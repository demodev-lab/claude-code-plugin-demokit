const path = require('path');

// io 모듈 mock
jest.mock('../../lib/core', () => ({
  io: {
    ensureDir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
  },
}));

const { io } = require('../../lib/core');
const { getArtifactDir, saveArtifacts, loadArtifacts } = require('../../lib/superwork/artifact-writer');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getArtifactDir', () => {
  it('projectRoot/.demodev/featureSlug 경로 반환', () => {
    const dir = getArtifactDir('/project', 'my-feature');
    expect(dir).toBe(path.join('/project', '.demodev', 'my-feature'));
  });
});

describe('saveArtifacts', () => {
  const artifacts = {
    prd: '# PRD content',
    design: '# DESIGN content',
    tasks: '# TASKS content',
    tasksYaml: 'version: "1.0"\n',
  };

  it('4개 파일 생성 (PRD.md, DESIGN.md, TASKS.md, TASKS.yaml)', () => {
    saveArtifacts('/project', 'feat', artifacts);

    const dir = path.join('/project', '.demodev', 'feat');
    expect(io.writeFile).toHaveBeenCalledWith(path.join(dir, 'PRD.md'), artifacts.prd);
    expect(io.writeFile).toHaveBeenCalledWith(path.join(dir, 'DESIGN.md'), artifacts.design);
    expect(io.writeFile).toHaveBeenCalledWith(path.join(dir, 'TASKS.md'), artifacts.tasks);
    expect(io.writeFile).toHaveBeenCalledWith(path.join(dir, 'TASKS.yaml'), artifacts.tasksYaml);
    expect(io.writeFile).toHaveBeenCalledTimes(4);
  });

  it('디렉토리 생성 — ensureDir 호출', () => {
    saveArtifacts('/project', 'feat', artifacts);

    const dir = path.join('/project', '.demodev', 'feat');
    expect(io.ensureDir).toHaveBeenCalledWith(dir);
  });
});

describe('loadArtifacts', () => {
  it('파일 로드 — 4개 필드 반환', () => {
    io.readFile.mockImplementation((filePath) => {
      if (filePath.endsWith('PRD.md')) return '# PRD';
      if (filePath.endsWith('DESIGN.md')) return '# DESIGN';
      if (filePath.endsWith('TASKS.md')) return '# TASKS';
      if (filePath.endsWith('TASKS.yaml')) return 'version: "1.0"\n';
      return null;
    });

    const result = loadArtifacts('/project', 'feat');
    expect(result.prd).toBe('# PRD');
    expect(result.design).toBe('# DESIGN');
    expect(result.tasks).toBe('# TASKS');
    expect(result.tasksYaml).toBe('version: "1.0"\n');
  });

  it('파일 없으면 null 반환', () => {
    io.readFile.mockReturnValue(null);

    const result = loadArtifacts('/project', 'missing');
    expect(result.prd).toBeNull();
    expect(result.design).toBeNull();
    expect(result.tasks).toBeNull();
    expect(result.tasksYaml).toBeNull();
  });
});
