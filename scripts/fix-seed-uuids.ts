import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

function generateUUID() {
  return crypto.randomUUID();
}

async function main() {
  const dbPath = path.resolve(process.cwd(), 'src/data/db.json');
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const idMap = new Map<string, string>();

  // Helper to get or create UUID for an old ID
  const mapId = (oldId: string) => {
    if (!oldId) return oldId;
    if (idMap.has(oldId)) return idMap.get(oldId);
    const newId = generateUUID();
    idMap.set(oldId, newId);
    return newId;
  };

  // Update Users
  if (data.users) {
    for (const u of data.users) {
      u.id = mapId(u.id);
    }
  }

  // Update Forms
  if (data.forms) {
    for (const f of data.forms) {
      f.id = mapId(f.id);
    }
  }

  // Update Bundles
  if (data.bundles) {
    for (const b of data.bundles) {
      b.id = mapId(b.id);
      if (b.formIds) {
        b.formIds = b.formIds.map((fid: string) => mapId(fid));
      }
    }
  }

  // Update Schedules
  if (data.schedules) {
    for (const s of data.schedules) {
      s.id = mapId(s.id);
      s.staffId = mapId(s.staffId);
      if (s.formId) s.formId = mapId(s.formId);
      if (s.supervisorId) s.supervisorId = mapId(s.supervisorId);
    }
  }

  // Write back
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Successfully updated db.json with valid UUIDs!');
}

main().catch(console.error);
