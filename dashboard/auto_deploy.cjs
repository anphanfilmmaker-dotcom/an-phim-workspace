const { exec } = require('child_process');

console.log("🤖 Auto-Deploy Bot started! Checking GitHub every 30 seconds...");

setInterval(() => {
    // 1. Fetch latest changes
    exec('cd ~/an-phim-workspace && git remote set-url origin https://github.com/anphanfilmmaker-dotcom/an-phim-workspace.git && git fetch origin main', (err) => {
        if (err) return; // If fetch fails (e.g. no internet), just wait for next cycle
        
        // 2. Check how many commits we are behind
        exec('cd ~/an-phim-workspace && git rev-list HEAD...origin/main --count', (err2, stdout2) => {
            if (err2) return;
            const count = parseInt(stdout2.trim());
            
            if (count > 0) {
                console.log(`[${new Date().toISOString()}] Detected ${count} new commits! Triggering deployment...`);
                
                // 3. Trigger deployment
                exec('bash ~/an-phim-workspace/dashboard/deploy.sh', (err3, stdout3, stderr3) => {
                    if (err3) {
                        console.error('Deployment failed:', stderr3);
                    } else {
                        console.log('Deployment successful!');
                    }
                });
            }
        });
    });
}, 30000); // Check every 30 seconds
