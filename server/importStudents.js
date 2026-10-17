const fs=require('fs');
const bcrypt=require('bcryptjs');
const {ensureSchema}=require('./migrations');
const {run,get}=require('./database');
function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 const headers=rows.shift().map(x=>x.trim().toLowerCase().replace(/[\s-]+/g,'_'));
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]||'').trim()])));
}
(async()=>{try{
 const file=process.argv[2];if(!file){console.error('Usage: node server/importStudents.js path\\to\\students.csv');process.exit(1);}
 await ensureSchema();
 const records=parseCSV(fs.readFileSync(file,'utf8'));
 const initialHash=await bcrypt.hash('Pass@123',12);let added=0,updated=0,skipped=0;
 for(const r of records){
  const email=(r.email||r.email_id||r.student_email||'').toLowerCase().trim();
  const name=r.full_name||r.name||r.student_name||'';
  const year=(r.academic_year||r.class_year||r.class||r.year||'').toUpperCase().replace(/^BCA\s*/,'').split(/[\s-]/)[0];
  const division=(r.division||r.div||'').toUpperCase();
  const roll=r.roll_number||r.roll_no||r.roll||r.rollno||'';
  const admission=r.admission_year||r.admissionyear||'';
  const practicalBatch=r.practical_batch||r.practicalbatch||r.batch||'';
  if(!email||!email.includes('@')||!name){skipped++;continue;}
  const exists=await get('SELECT id FROM student_accounts WHERE lower(email)=lower(?)',[email]);
  if(exists){
   await run('UPDATE student_accounts SET full_name=?,academic_year=?,division=?,roll_number=?,admission_year=?,practical_batch=? WHERE id=?',[name,year,division,roll,admission,practicalBatch,exists.id]);updated++;
  }else{
   await run('INSERT INTO student_accounts(email,full_name,academic_year,division,roll_number,admission_year,practical_batch,password_hash,must_change_password) VALUES(?,?,?,?,?,?,?,?,1)',[email,name,year,division,roll,admission,practicalBatch,initialHash]);added++;
  }
 }
 console.log(`Student roster import complete. Added: ${added}; updated roster details: ${updated}; skipped invalid rows: ${skipped}. Initial password for newly created accounts: Pass@123. Existing passwords were preserved.`);
}catch(e){console.error('Student import failed:',e.message);process.exit(1)}})();
