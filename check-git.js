import simpleGit from 'simple-git';

async function run() {
  const git = simpleGit();
  try {
    const status = await git.status();
    console.log('Status:', status);
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
