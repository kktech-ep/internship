/**
 * Script to:
 * 1. Update prefix "ว่าที่ร้อยตรี ทักษิณ" to "นายทักษิณ" everywhere in Firebase Firestore
 * 2. Delete all records and users associated with "อาจารย์สุพรรณี ใจดี" / "สุพรรณี ใจดี" from Firestore
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  setDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const customDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
const db = customDbId ? getFirestore(app, customDbId) : getFirestore(app);

function replaceThaksinPrefix(str: string): string {
  if (!str) return str;
  return str
    .replace(/ว่าที่ร้อยตรี\s*ทักษิณ/g, 'นายทักษิณ')
    .replace(/ว่าที่ร้อยตรีทักษิณ/g, 'นายทักษิณ');
}

function deepCleanObject(obj: any): { modified: boolean; cleaned: any } {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && (obj.includes('ว่าที่ร้อยตรี ทักษิณ') || obj.includes('ว่าที่ร้อยตรีทักษิณ'))) {
      return { modified: true, cleaned: replaceThaksinPrefix(obj) };
    }
    return { modified: false, cleaned: obj };
  }

  if (Array.isArray(obj)) {
    let anyMod = false;
    const newArr = obj.map(item => {
      const res = deepCleanObject(item);
      if (res.modified) anyMod = true;
      return res.cleaned;
    });
    return { modified: anyMod, cleaned: newArr };
  }

  let anyMod = false;
  const newObj: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const res = deepCleanObject(v);
    if (res.modified) anyMod = true;
    newObj[k] = res.cleaned;
  }
  return { modified: anyMod, cleaned: newObj };
}

async function runUpdate() {
  console.log(`Connecting to Firestore (DB: ${customDbId || 'default'})...`);

  const collectionsToCheck = [
    'users',
    'teachers',
    'students',
    'login_sheet',
    'companies',
    'form3_supervisions',
    'submissions',
    'announcements'
  ];

  let totalUpdated = 0;
  let totalDeleted = 0;

  for (const colName of collectionsToCheck) {
    console.log(`Checking collection: /${colName}...`);
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`  Found ${snap.size} documents in /${colName}`);

      for (const d of snap.docs) {
        const data = d.data();
        const dataStr = JSON.stringify(data);

        // Check if document belongs to or mentions Supannee Jaidee
        const isSupanneeDoc = (
          d.id.toLowerCase().includes('supannee') ||
          d.id.toLowerCase().includes('supanee') ||
          (data.name && (data.name.includes('สุพรรณี') || data.name.includes('ใจดี'))) ||
          (data.email && (data.email.includes('supannee') || data.email.includes('supanee'))) ||
          (data.user && (data.user.includes('supannee') || data.user.includes('supanee')))
        );

        if (isSupanneeDoc) {
          if (colName === 'users' || colName === 'teachers' || colName === 'login_sheet') {
            console.log(`  [DELETE] Removing Supannee user doc: /${colName}/${d.id}`);
            await deleteDoc(doc(db, colName, d.id));
            totalDeleted++;
            continue;
          }
        }

        // Check for field replacements
        let needsUpdate = false;
        const updatedFields: any = {};

        // Replace Supannee as supervisor/teacher with นายทักษิณ โสภาปิยะ
        if (data.supervisorTeacher && data.supervisorTeacher.includes('สุพรรณี')) {
          updatedFields.supervisorTeacher = 'นายทักษิณ โสภาปิยะ';
          needsUpdate = true;
        }
        if (data.assignedTeacher && data.assignedTeacher.includes('สุพรรณี')) {
          updatedFields.assignedTeacher = 'นายทักษิณ โสภาปิยะ';
          needsUpdate = true;
        }
        if (data.teacherName && data.teacherName.includes('สุพรรณี')) {
          updatedFields.teacherName = 'นายทักษิณ โสภาปิยะ';
          needsUpdate = true;
        }
        if (data.teacherSignature && data.teacherSignature.includes('สุพรรณี')) {
          updatedFields.teacherSignature = 'ทักษิณ โสภาปิยะ';
          needsUpdate = true;
        }

        // Check for "ว่าที่ร้อยตรี ทักษิณ" in all fields
        const { modified, cleaned } = deepCleanObject(data);
        if (modified) {
          Object.assign(updatedFields, cleaned);
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log(`  [UPDATE] Updating /${colName}/${d.id}`);
          await setDoc(doc(db, colName, d.id), { ...data, ...updatedFields }, { merge: true });
          totalUpdated++;
        }
      }
    } catch (err) {
      console.error(`Error checking collection ${colName}:`, err);
    }
  }

  // Ensure user and teacher doc for thaksinso has prefix "นายทักษิณ โสภาปิยะ"
  try {
    const thaksinUserIds = ['thaksinso', 'thaksinso_kktech_ac_th', 'thaksinso@kktech.ac.th', 'tch-thaksinso'];
    for (const uid of thaksinUserIds) {
      try {
        await setDoc(doc(db, 'users', uid), {
          name: 'นายทักษิณ โสภาปิยะ',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        // ignore if doesn't exist
      }
    }

    // Also update teachers collection
    const teacherSnap = await getDocs(collection(db, 'teachers'));
    for (const td of teacherSnap.docs) {
      const tdata = td.data();
      if (tdata.name && tdata.name.includes('ทักษิณ')) {
        await updateDoc(doc(db, 'teachers', td.id), {
          name: 'นายทักษิณ โสภาปิยะ',
          updatedAt: new Date().toISOString()
        });
        console.log(`  [TEACHER-UPDATE] Updated /teachers/${td.id} to นายทักษิณ โสภาปิยะ`);
      }
    }
  } catch (e) {
    console.warn('Notice updating thaksinso user/teacher:', e);
  }

  console.log(`\n==== FINISHED FIRESTORE UPDATE ====`);
  console.log(`Total documents updated: ${totalUpdated}`);
  console.log(`Total documents deleted (Supannee): ${totalDeleted}`);
}

runUpdate()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
