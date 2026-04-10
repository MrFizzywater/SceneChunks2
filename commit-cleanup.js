import simpleGit from 'simple-git';

async function run() {
  const git = simpleGit();
  try {
    await git.addConfig('user.name', 'AI Studio');
    await git.addConfig('user.email', 'ai@studio.com');
    await git.add('.');
    await git.commit('Clean up scripts');
    console.log('Successfully committed');
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
