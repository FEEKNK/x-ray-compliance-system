import { db } from '../server/db/index';
import * as schema from '../server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

async function main() {
    const staff = await db.select().from(schema.users).limit(1);
    const form = await db.select().from(schema.forms).where(schema.forms.id).limit(1);
    // Just use any form
    const allForms = await db.select().from(schema.forms).limit(1);
    const selectedForm = allForms[0];

    const data = {
        // some fake data that triggers failure
        q1: 'อื่นๆ',
        q1_other: 'test alert trigger'
    };

    // We need to fetch via API to test the actual route
    const res = await fetch('http://localhost:5173/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            staffId: staff[0].id,
            formId: selectedForm.id,
            data,
            photos: []
        })
    });

    console.log("POST status:", res.status);
    const result = await res.json();
    console.log("POST result:", result);

    const alerts = await db.select().from(schema.alerts).orderBy(schema.alerts.timestamp);
    console.log("Alerts after POST:", alerts);
}

main().catch(console.error);
