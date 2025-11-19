const { CloudWatchLogsClient, DescribeLogGroupsCommand } = require('@aws-sdk/client-cloudwatch-logs');

const client = new CloudWatchLogsClient({ region: 'us-east-1' });

async function listLogGroups() {
  try {
    const command = new DescribeLogGroupsCommand({
      logGroupNamePrefix: '/aws/lambda/alertautec'
    });
    
    const response = await client.send(command);
    
    console.log('📋 Log Groups disponibles:\n');
    
    if (response.logGroups) {
      response.logGroups.forEach(group => {
        console.log(`  - ${group.logGroupName}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listLogGroups();
