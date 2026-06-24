import { POST } from '../app/api/ext/sync/route';

async function run() {
  const req = new Request('http://localhost:3000/api/ext/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user_manager',
      tasks: [],
      notes: [],
      habits: []
    })
  });
  
  const res = await POST(req);
  const data = await res.json();
  console.log('Success:', data.success);
  console.log('Members count:', data.members?.length);
  console.log('Team tasks:', JSON.stringify(data.teamTasks, null, 2));
}

run().catch(console.error);
