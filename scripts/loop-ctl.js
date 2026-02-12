/**
 * Loop Control CLI
 * 루프 상태를 제어하는 커맨드라인 도구
 *
 * Usage:
 *   node scripts/loop-ctl.js start --prompt "..." [--max-iterations 10] [--completion-promise "LOOP_DONE"]
 *   node scripts/loop-ctl.js status
 *   node scripts/loop-ctl.js complete
 *   node scripts/loop-ctl.js cancel
 */
const path = require('path');

function main() {
  const { platform } = require(path.join(__dirname, '..', 'lib', 'core'));
  const loopState = require(path.join(__dirname, '..', 'lib', 'loop', 'state'));

  const projectRoot = platform.findProjectRoot(process.cwd());

  if (!projectRoot) {
    console.error('[demokit] 프로젝트 루트를 찾을 수 없습니다.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start': {
      const prompt = getArg(args, '--prompt');
      if (!prompt) {
        console.error('--prompt 필수');
        process.exit(1);
      }
      const maxIterations = parseInt(getArg(args, '--max-iterations') || '10', 10);
      const completionPromise = getArg(args, '--completion-promise') || 'LOOP_DONE';

      const state = loopState.startLoop(projectRoot, { prompt, maxIterations, completionPromise });
      console.log(JSON.stringify({
        message: `Loop 시작: ${maxIterations}회 반복, 완료 신호: '${completionPromise}'`,
        state,
      }, null, 2));
      break;
    }

    case 'status': {
      const state = loopState.getState(projectRoot);
      if (state.active) {
        console.log(JSON.stringify({
          message: `Loop 활성: ${state.currentIteration}/${state.maxIterations}회`,
          state,
        }, null, 2));
      } else {
        console.log(JSON.stringify({ message: 'Loop 비활성', state }, null, 2));
      }
      break;
    }

    case 'complete': {
      const state = loopState.completeLoop(projectRoot);
      console.log(JSON.stringify({ message: 'Loop 완료 처리됨', state }, null, 2));
      break;
    }

    case 'cancel': {
      loopState.cancelLoop(projectRoot);
      console.log(JSON.stringify({ message: 'Loop 취소됨' }, null, 2));
      break;
    }

    default:
      console.error(`사용법: node loop-ctl.js <start|status|complete|cancel>`);
      process.exit(1);
  }
}

function getArg(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

main();
