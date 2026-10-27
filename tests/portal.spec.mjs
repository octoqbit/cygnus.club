import { test, expect } from '@playwright/test';
import jsQR from 'jsqr';
import slots from '../content-slots.json' with {type:'json'};

// Keep browser tests independent of external font availability.
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.route('https://fonts.gstatic.com/**',route=>route.abort());});

const adminId='00000000-0000-4000-8000-000000000001',memberId='00000000-0000-4000-8000-000000000002',eventId='00000000-0000-4000-8000-000000000003',projectId='00000000-0000-4000-8000-000000000004';
async function mock(page,{role='admin',signedIn=false,status='approved',empty=false}={}){
  const profile={id:role==='admin'?adminId:memberId,email:`${role}@example.test`,name:role==='admin'?'Alex Admin':'Jamie Member',avatar:role==='admin'?'technologist':'robot',pronouns:'he/him',role,status,member_id:'CYG-CS-001',qr_token:'11111111-1111-4111-8111-111111111111',mobile_number:'+919876543210',department:'CS',study_year:'2',interests:['Robotics'],motivation:'I want to build robots.',submitted_at:'2026-01-01',created_at:'2026-01-01'};
  const applicant={...profile,id:'00000000-0000-4000-8000-000000000005',name:'New Maker',email:'maker@example.test',role:'member',status:'pending',member_id:null,qr_token:'22222222-2222-4222-8222-222222222222'};
  const user={id:profile.id,email:profile.email,email_confirmed_at:'2026-01-01',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01'};
  const session={access_token:'test-access-token',refresh_token:'test-refresh-token',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
  const state={profile,items:empty?[]:[{id:eventId,kind:'event',slug:'future-build',title:'Future Build',summary:'Build something together.',image:'/about-assets/ai_hackathon.jpg',image_alt:'Robotics workshop',tags:['Robotics'],published:true,sort_order:1,data:{shortTitle:'FUTURE BUILD',subtitle:'A HANDS-ON WORKSHOP',startDate:'2099-01-01',endDate:'2099-01-02',location:'The lab',prizePool:'1,000',symbol:'01',accentColor:'#00e5ff',homeBeyond:true,homeExperience:true,registrationOpen:true}},{id:projectId,kind:'project',slug:'atlas',title:'Atlas Rover',summary:'Public rover preview.',image:'/showcase-assets/rover.jpg',image_alt:'Rover',tags:['Robotics'],published:true,sort_order:1,data:{category:'robotics',subtitle:'AUTONOMOUS EXPLORATION',status:'Concept',homeProject:true}}],memories:[],projectDetails:{},values:{},registrations:[],calls:[],applicant,privateBody:'Members-only instructions. Bring your robot kit.'};
  if(signedIn)await page.addInitScript(session=>localStorage.setItem('sb-sac-test-auth-token',JSON.stringify(session)),session);
  await page.route('https://sac-test.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method(),body=req.headers()['content-type']?.includes('application/json')?req.postDataJSON():null;
    state.calls.push({path,method,body,url:req.url()});
    let data=[];
    if(method==='OPTIONS')return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
    if(path.includes('/auth/v1/token'))data=session;
    else if(path.includes('/auth/v1/user'))data=user;
    else if(path.includes('/auth/v1/logout'))data={};
    else if(path.includes('/auth/v1/signup'))data={user:{...user,identities:[{}]},session:null};
    else if(path.includes('/auth/v1/recover'))data={};
    else if(path.endsWith('/profiles'))data=url.searchParams.has('id')?state.profile:[state.profile,state.applicant,...(state.extraProfiles||[])];
    else if(path.endsWith('/rpc/review_member')){state.applicant.status=body.decision;state.applicant.member_id='CYG-CS-002';data=null;}
    else if(path.endsWith('/rpc/set_core_member')){state.profile.role=body.enabled?'core_member':'member';data=null;}
    else if(path.endsWith('/rpc/verify_member_qr')){data=body.target_member_id===state.profile.member_id&&body.target_token===state.profile.qr_token?{name:state.profile.name,member_id:state.profile.member_id,department:state.profile.department,mobile_number:state.profile.mobile_number,status:'approved'}:null;}
    else if(path.endsWith('/rpc/save_profile')){state.profile.name=body.display_name;state.profile.avatar=body.emoji;state.profile.mobile_number=body.contact_number;data=null;}
    else if(path.endsWith('/rpc/submit_application')){Object.assign(state.profile,{name:body.display_name,mobile_number:body.contact_number,pronouns:body.member_pronouns,submitted_at:new Date().toISOString()});data=null;}
    else if(path.endsWith('/rpc/save_content')){const item={...body.item,id:body.item.id||crypto.randomUUID()};if(item.kind==='project'){const keys=['category','subtitle','status','homeProject','heroFeatured','imageCaption'];state.projectDetails[item.id]=Object.fromEntries(Object.entries(item.data).filter(([key])=>!keys.includes(key)));item.data=Object.fromEntries(Object.entries(item.data).filter(([key])=>keys.includes(key)));}state.items=state.items.filter(i=>i.id!==item.id).concat(item);state.privateBody=body.private_body;data=item.id;}
    else if(path.endsWith('/memories')) {
      const id=url.searchParams.get('id')?.replace('eq.','');
      if(method==='POST'){const item={...body,id:crypto.randomUUID()};state.memories.push(item);data={id:item.id};}
      else if(method==='PATCH'){state.memories=state.memories.map(item=>item.id===id?{...item,...body}:item);data={id};}
      else if(method==='DELETE'){state.memories=state.memories.filter(item=>item.id!==id);data={id};}
      else data=state.memories.filter(item=>!url.searchParams.has('published')||item.published).sort((a,b)=>a.sort_order-b.sort_order);
    }
    else if(path.endsWith('/content_details'))data={body:state.privateBody,data:state.projectDetails[url.searchParams.get('content_id')?.replace('eq.','')]||{}};
    else if(path.endsWith('/site_content')){
      if(method==='POST'){for(const row of body)state.values[row.id]=row.value;}
      if(method==='DELETE'){
        const id=url.searchParams.get('id')?.replace('eq.','');
        data=id in state.values?[{id}]:[];
        delete state.values[id];
      }else data=url.searchParams.get('id')==='eq.applications_open'?{value:state.values.applications_open}:Object.entries(state.values).map(([id,value])=>({id,value}));
    }
    else if(path.endsWith('/content')){
      if(method==='DELETE'){state.items=state.items.filter(i=>`eq.${i.id}`!==url.searchParams.get('id'));data=null;}
      else data=state.items.filter(i=>(!url.searchParams.has('kind')||`eq.${i.kind}`===url.searchParams.get('kind'))&&(!url.searchParams.has('published')||i.published));
    }
    else if(path.endsWith('/registrations')){
      if(method==='POST')state.registrations.push({...body,created_at:new Date().toISOString(),content:{title:'Future Build'},profiles:{name:'Jamie',email:'member@example.test',member_id:'CYG-CS-001'}});
      if(method==='DELETE')state.registrations=[];
      data=req.headers().accept?.includes('application/vnd.pgrst.object+json')?(state.registrations[0]||null):state.registrations;
    }
    return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
  });
  return state;
}

test('approved members can open the merchandise coming-soon message', async ({page}, info) => {
  const state = await mock(page, {role:'member', signedIn:true});
  await page.goto('/account');
  const merchandise = page.getByRole('region', {name:'CYGNUS merchandise'});
  await expect(merchandise).toBeVisible();
  await expect(merchandise.getByRole('heading', {name:'ID card', exact:true})).toBeHidden();
  await expect(merchandise.getByRole('button', {name:'Get merchandise'})).toHaveAttribute('aria-expanded', 'false');
  const profileBox = await page.locator('.member-profile').boundingBox();
  const merchandiseBox = await merchandise.boundingBox();
  expect(merchandiseBox.x).toBeCloseTo(profileBox.x, 0);
  expect(merchandiseBox.width).toBeCloseTo(profileBox.width, 0);
  expect(merchandiseBox.y - (profileBox.y + profileBox.height)).toBeCloseTo(24, 0);
  await expect(merchandise.getByRole('status')).toHaveCount(0);
  await merchandise.getByRole('button', {name:'Get merchandise'}).click();
  await expect(merchandise.getByRole('button', {name:'Get merchandise'})).toHaveAttribute('aria-expanded', 'true');
  await expect(merchandise.getByRole('heading', {name:'ID card', exact:true})).toBeVisible();
  await expect(merchandise.getByText('Coming soon', {exact:true})).toBeVisible();
  await expect(merchandise.getByText('Awaiting', {exact:true})).toBeVisible();
  await expect(merchandise.getByRole('status')).toContainText('CYGNUS merchandise is coming soon.');
  await merchandise.screenshot({path:info.outputPath('merchandise-desktop.png')});
  await page.setViewportSize({width:375,height:812});
  await merchandise.scrollIntoViewIfNeeded();
  const mobileQR = await page.locator('.member-qr').boundingBox();
  const mobileMerchandise = await merchandise.boundingBox();
  const mobileRegistrations = await page.locator('.member-registrations').boundingBox();
  expect(mobileMerchandise.y).toBeGreaterThan(mobileQR.y + mobileQR.height);
  expect(mobileRegistrations.y).toBeGreaterThan(mobileMerchandise.y + mobileMerchandise.height);
  await expect(page.getByRole('region', {name:'CYGNUS merchandise'})).toHaveCount(1);
  expect(await merchandise.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await merchandise.screenshot({path:info.outputPath('merchandise-mobile.png')});
  const toggle = merchandise.getByRole('button', {name:'Get merchandise'});
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(merchandise.getByRole('heading', {name:'ID card', exact:true})).toBeHidden();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(merchandise.getByText('Awaiting', {exact:true})).toBeVisible();
  expect(state.calls.filter(call => call.method === 'POST')).toEqual([]);
});

test('merchandise appears only after membership approval', async ({page}) => {
  const state = await mock(page, {role:'member', signedIn:true, status:'pending'});
  for (const status of ['pending', 'rejected', 'suspended', 'approved']) {
    state.profile.status = status;
    await page.goto('/account');
    await expect(page.getByRole('heading', {name:'Hello, Jamie.'})).toBeVisible();
    await expect(page.getByRole('button', {name:'Get merchandise'})).toHaveCount(status === 'approved' ? 1 : 0);
  }
});

test('admin login is clean on desktop and mobile; non-admin login is rejected',async({page},info)=>{
  await mock(page,{role:'member'});await page.goto('/admin');
  await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
  await page.screenshot({path:info.outputPath('admin-login-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await expect(page.locator('body')).toHaveJSProperty('scrollWidth',390);
  await page.screenshot({path:info.outputPath('admin-login-mobile.png'),fullPage:true});
  await page.getByLabel('Admin ID (email)').fill('member@example.test');await page.getByLabel('Password',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Sign in to admin'}).click();
  await expect(page.getByRole('alert')).toContainText('Invalid login Credentials');
});

test('admin publishes, edits, unpublishes and removes a homepage memory',async({page},info)=>{
  const state=await mock(page,{signedIn:true});
  const openMemories = async () => {
    await page.goto('/admin');
    await expect(page.locator('.admin-shell')).toBeVisible();
    const menu = page.getByRole('button', {name:'Open admin navigation'});
    if (await menu.isVisible()) await menu.click();
    await page.getByRole('button', {name:'Memories', exact:true}).click();
  };
  await openMemories();
  await page.getByRole('button',{name:'Add memory'}).click();
  await page.route('**/storage/v1/object/content-images/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({Key:'content-images/memory.jpg'})}));
  await page.route('**/storage/v1/object/public/content-images/**',route=>route.fulfill({path:'about-assets/ai_hackathon.jpg',contentType:'image/jpeg'}));
  await page.getByLabel('Upload a photo').setInputFiles('about-assets/ai_hackathon.jpg');
  await expect(page.getByLabel('Photo URL',{exact:true})).toHaveValue(/https:\/\/sac-test.supabase.co\/storage\/v1\/object\/public\/content-images\//);
  await page.getByLabel('Image description (accessibility)').fill('Students working together at a table');
  await page.getByLabel('Memory title').fill('Our first build night');
  await page.getByLabel('Caption',{exact:true}).fill('One circuit. Many ideas.');
  await page.getByLabel('Date taken').fill('2026-10-13');
  await page.getByLabel('Category',{exact:true}).selectOption('Build sessions');
  await page.getByRole('button',{name:'Save memory'}).click();
  await expect(page.getByRole('status')).toHaveText('Memory saved as a draft.');
  await page.goto('/');await expect(page.locator('.memories-empty')).toBeVisible();
  await expect(page.locator('[data-event-carousel]')).toHaveCount(1);
  await openMemories();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByLabel('Publish on homepage').check();
  await page.getByRole('button',{name:'Save memory'}).click();
  await expect(page.getByRole('status')).toHaveText('Memory published to Life at CYGNUS.');
  await page.goto('/');await expect(page.locator('.memory-showcase-title')).toHaveText('Our first build night');
  await expect(page.locator('.memory-showcase-caption')).toHaveText('One circuit. Many ideas.');
  await openMemories();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:info.outputPath('memory-editor-mobile.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('Caption',{exact:true}).fill('The edited story.');await page.getByLabel('Publish on homepage').uncheck();
  await page.getByRole('button',{name:'Save memory'}).click();await expect.poll(()=>state.memories[0].caption).toBe('The edited story.');
  await page.goto('/');await expect(page.locator('.memories-empty')).toBeVisible();
  await openMemories();await page.getByRole('button',{name:'Edit',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete memory'}).click();await expect.poll(()=>state.memories.length).toBe(0);
});

for(const width of [390,1440])test(`memories showcase and corner peel work at ${width}px`,async({page},info)=>{
  const state=await mock(page);
  state.values['home-memory-03-0']='LIFE AT';
  // Existing artwork is a test fixture, never a seeded club memory.
  state.memories=Array.from({length:8},(_,i)=>({id:`memory-${i}`,title:`Build moment ${i+1}`,caption:'The people behind the projects.',image:'/about-assets/ai_hackathon.jpg',image_alt:'Test workshop photograph',taken_on:'2026-10-13',category:'Workshops',sort_order:i,published:i<7}));
  await page.setViewportSize({width,height:900});await page.goto('/');
  await expect(page.locator('#memories-compartment')).toBeVisible();
  await expect(page.locator('.poster-count')).toHaveText('01 / 07');
  await expect(page.locator('.memory-showcase-title')).toHaveText('Build moment 1');
  const opener = page.getByRole('button',{name:'Open memory details',exact:true});
  const viewer = page.getByRole('dialog',{name:'Build moment 1'});
  await expect(page.locator('#memory-viewer')).not.toBeVisible();
  await expect(page.locator('#memories-title')).toHaveText('Moments atCYGNUS.');
  await expect(page.getByRole('dialog', {name:'Welcome to CYGNUS'})).toHaveCount(0);
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('.memory-viewer-image')).toHaveAttribute('alt','Test workshop photograph');
  await expect(viewer.locator('.memory-caption')).toHaveText('The people behind the projects.');
  await expect(viewer.locator('.memory-meta')).toHaveText('Workshops · 13 Oct 2026');
  await page.screenshot({path:info.outputPath(`memory-popup-${width}.png`)});
  const box = await viewer.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y + box.height).toBeLessThanOrEqual(900);
  await page.clock.install();
  await page.clock.runFor(5000);
  await expect(page.locator('.poster-count')).toHaveText('01 / 07');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#memory-viewer-title')).toHaveText('Build moment 7');
  await page.getByRole('button',{name:'Next memory',exact:true}).click();
  await expect(page.locator('#memory-viewer-title')).toHaveText('Build moment 1');
  await page.keyboard.press('Escape');
  await expect(page.locator('#memory-viewer')).not.toBeVisible();
  await expect(opener).toBeFocused();
  await expect(page.locator('html')).not.toHaveClass(/memory-viewer-open/);
  await opener.click();
  await page.getByRole('button',{name:'Close memory',exact:true}).click();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.mouse.click(2,2);
  await expect(page.locator('#memory-viewer')).not.toBeVisible();
  await page.locator('#memories').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath(`memories-${width}.png`),fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Next photo',exact:true}).click();
  await expect(page.locator('.poster-count')).toHaveText('02 / 07');
  await expect(page.locator('.memory-showcase-title')).toHaveText('Build moment 2');
  await expect(page.locator('.poster-viewport')).not.toHaveClass(/is-peeling/);
  await page.getByRole('button',{name:'Previous photo',exact:true}).click();
  await expect(page.locator('.poster-count')).toHaveText('01 / 07');
  await expect(page.locator('.memory-showcase-title')).toHaveText('Build moment 1');
});

test('a single memory opens with optional details absent and navigation disabled',async({page})=>{
  const state=await mock(page);
  state.memories=[{id:'single',title:'A shared afternoon',caption:'',image:'/showcase-assets/crew.jpg',image_alt:'Club members together',taken_on:null,category:'Team moments',sort_order:0,published:true}];
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('.poster-count')).toHaveText('01 / 01');
  await page.getByRole('button',{name:'Open memory details',exact:true}).click();
  const viewer=page.getByRole('dialog',{name:'A shared afternoon'});
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('.memory-meta')).toHaveText('Team moments');
  await expect(viewer.locator('.memory-caption')).toBeEmpty();
  await expect(viewer.getByRole('button',{name:'Next memory'})).toBeDisabled();
  await expect(viewer.getByRole('button',{name:'Previous memory'})).toBeDisabled();
  await viewer.getByRole('button',{name:'Close memory'}).click();
  await expect(viewer).not.toBeVisible();
});

test('album loads independently, retries failures, and keeps an honest empty state',async({page},info)=>{
  await mock(page);let attempts=0;
  await page.route('**/rest/v1/memories?**',route=>{
    attempts++;
    return route.fulfill({status:attempts===1?403:200,contentType:'application/json',body:JSON.stringify(attempts===1?{message:'Unavailable',code:'42501'}:[])});
  });
  await page.goto('/');await expect(page.getByText('The album couldn’t load. Please try again.')).toBeVisible();
  await expect(page.locator('[data-event-carousel] .home-event-slide')).toHaveCount(1);
  await page.getByRole('button',{name:'TRY AGAIN'}).click();await expect(page.locator('.memories-empty')).toBeVisible();
  await page.locator('#memories').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('empty-album.png')});
});
test('admin can add and delete an event, edit website text, and review an applicant',async({page},info)=>{
  const state=await mock(page,{signedIn:true});await page.goto('/admin');
  await expect(page.getByRole('heading',{name:'Your club, at a glance.'})).toBeVisible();
  await page.screenshot({path:info.outputPath('admin-overview.png'),fullPage:true});
  await page.getByRole('button',{name:'Events',exact:true}).click();await page.getByRole('button',{name:'Add event',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Circuit Jam');await page.getByLabel('Public introduction').fill('An evening for makers.');await page.getByLabel('Start date').fill('2099-01-01');await page.getByLabel('End date').fill('2099-01-02');await page.getByLabel('Full details').fill('Private workshop instructions.');await page.getByLabel('Published on the website').check();
  await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('cell',{name:'Circuit Jam circuit-jam'})).toBeVisible();
  expect(state.items.find(i=>i.slug==='circuit-jam').published).toBe(true);
  await page.getByRole('button',{name:'Website content',exact:true}).click();await page.getByRole('button',{name:'Home · Beyond Circuits',exact:true}).click();
  await page.getByLabel('BEYOND',{exact:true}).fill('BEYOND TOMORROW ');await page.getByRole('button',{name:/Save changes/}).click();await expect(page.getByRole('status')).toContainText('Website content saved');
  await page.getByRole('button',{name:/^Applications/}).click();await page.getByRole('button',{name:'Review',exact:true}).last().click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Approve & assign ID'}).click();await expect.poll(()=>state.applicant.status).toBe('approved');
  await page.goto('/');await expect(page.locator('.s2-giant-text')).toContainText('BEYOND TOMORROW');await expect(page.locator('.section-two .home-event-slide')).toHaveCount(2);
  await page.goto('/admin');await page.getByRole('button',{name:'Events',exact:true}).click();await page.getByRole('row').filter({hasText:'Circuit Jam'}).getByRole('button',{name:'Edit'}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete event'}).click();await expect.poll(()=>state.items.some(i=>i.slug==='circuit-jam')).toBe(false);
});
test('public project cards and banners remain visible, but opening details requires login',async({page})=>{
  const state=await mock(page);await page.goto('/projects.html');await expect(page.getByText('Public rover preview.')).toBeVisible();
  await expect(page.locator('[data-project-hero] img')).toBeVisible();
  await page.getByRole('link',{name:'Explore Atlas Rover'}).click();await expect(page).toHaveURL(/\/account\?next=/);
  expect(new URL(page.url()).searchParams.get('next')).toBe('/project.html?project=atlas');
  expect(state.calls.filter(c=>c.path.endsWith('/content_details')).length).toBe(0);
  await page.goto('/project.html?project=atlas');await expect(page).toHaveURL(/\/account\?next=/);
  expect(state.calls.filter(c=>c.path.endsWith('/content_details')).length).toBe(0);
  await page.goto('/events.html');await expect(page.locator('.ev-ticket')).toHaveCount(1);await page.getByRole('button',{name:'View details for Future Build'}).click();await expect(page).toHaveURL(/\/account\?next=/);
});

for(const status of ['pending','rejected','suspended'])test(`${status} users cannot open project details even with a cached member flag`,async({page})=>{
  const state=await mock(page,{role:'member',signedIn:true,status});
  await page.addInitScript(id=>localStorage.setItem('sac-approved-member',JSON.stringify({userId:id,approved:true})),memberId);
  await page.goto('/project.html?project=atlas');
  await expect(page).toHaveURL(/\/account\?next=/);
  expect(state.calls.filter(c=>c.path.endsWith('/content_details')).length).toBe(0);
  await expect(page.getByText('Members-only instructions. Bring your robot kit.')).toHaveCount(0);
});

test('approved members can open a project directly and read protected briefs',async({page})=>{
  const state=await mock(page,{role:'member',signedIn:true});
  state.projectDetails[projectId]={overview:'A protected build brief.',githubUrl:'https://github.com/SAclub/atlas'};
  await page.goto('/project.html?project=atlas');
  await expect(page.getByText('A protected build brief.')).toBeVisible();
  await expect(page.getByRole('link',{name:'VIEW ON GITHUB'})).toHaveAttribute('href','https://github.com/SAclub/atlas');
  await page.getByRole('button',{name:'Open member notes'}).click();
  await expect(page.locator('#member-notes-body')).toHaveText(state.privateBody);
});

test('failed protected project requests do not reveal legacy public detail fields',async({page})=>{
  const state=await mock(page,{role:'member',signedIn:true});
  state.items.find(item=>item.kind==='project').data.overview='Legacy exposed brief';
  await page.route('**/rest/v1/content_details?**',route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Access denied'})}));
  await page.goto('/project.html?project=atlas');
  await expect(page.getByRole('heading',{name:'Could not load this project.'})).toBeVisible();
  await expect(page.locator('#project-detail')).toBeHidden();
  await expect(page.getByText('Legacy exposed brief')).toHaveCount(0);
});

test('admin project edits persist in the detail page, card, and hero',async({page},info)=>{
  await page.addInitScript(()=>sessionStorage.setItem('sac_booted','true'));
  const state=await mock(page,{signedIn:true});await page.goto('/admin');
  await page.getByRole('button',{name:'Projects',exact:true}).click();
  await page.getByRole('row').filter({hasText:'Atlas Rover'}).getByRole('button',{name:'Edit'}).click();
  await page.getByLabel('Project overview',{exact:true}).fill('An editable rover brief for a supervised navigation experiment.');
  await page.getByLabel('Problem to solve').fill('Detect obstacles and stop predictably.');
  await page.getByLabel('Build approach').fill('Start with sensing, then validate navigation.');
  await page.getByLabel('Features · one per line').fill('Obstacle detection\nManual stop');
  await page.getByLabel('Components and technologies').fill('Microcontroller\nDistance sensor');
  await page.getByLabel('Milestones · one per line').fill('Assemble base\nTest movement');
  await page.getByLabel('Next steps').fill('Prepare a supervised trial.');
  await page.getByLabel('GitHub repository URL').fill('https://github.com/example/atlas');
  await page.getByLabel('Image URL',{exact:true}).fill('/showcase-assets/project-atlas.jpg');
  await page.getByLabel('Image caption',{exact:true}).fill('Rover concept illustration');
  await page.getByLabel('Feature near the start').check();
  await page.screenshot({path:info.outputPath('project-admin.png'),fullPage:true});
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Projects',exact:true})).toBeVisible();
  expect(state.items.find(i=>i.kind==='project').data.githubUrl).toBeUndefined();
  expect(state.projectDetails[projectId].githubUrl).toBe('https://github.com/example/atlas');
  await page.getByRole('row').filter({hasText:'Atlas Rover'}).getByRole('button',{name:'Edit'}).click();
  await expect(page.getByRole('textbox',{name:'Project overview',exact:true})).toHaveValue('An editable rover brief for a supervised navigation experiment.');
  await page.goto('/projects.html');
  await expect(page.locator('[data-project-hero] img')).toHaveAttribute('src','/showcase-assets/project-atlas-1280.webp');
  await expect(page.locator('.experiment-image img')).toHaveAttribute('src','/showcase-assets/project-atlas-1280.webp');
  await page.getByRole('link',{name:'Explore Atlas Rover'}).click();
  await expect(page.getByText('An editable rover brief for a supervised navigation experiment.')).toBeVisible();
  await expect(page.getByRole('link',{name:'VIEW ON GITHUB'})).toHaveAttribute('href','https://github.com/example/atlas');
  await expect(page.locator('#project-features li')).toHaveCount(2);
  await expect(page.locator('#project-milestones li')).toHaveCount(2);
  await page.getByRole('button',{name:'Open member notes'}).click();
  await expect(page.locator('#member-notes-body')).toHaveText(state.privateBody);
  await page.screenshot({path:info.outputPath('project-detail-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('project-detail-mobile.png'),fullPage:true});
  await page.goto('/projects.html?project=atlas');
  await expect(page).toHaveURL(/\/project.html\?project=atlas/);
});

test('all original concepts have public artwork and protected member briefs',async({page},info)=>{
  await page.addInitScript(()=>sessionStorage.setItem('sac_booted','true'));
  const state=await mock(page,{role:'member',signedIn:true});
  const {projectDefaults}=await import('../lib/project-data.mjs');
  state.items=Object.keys(projectDefaults).map((slug,i)=>({id:`project-${i}`,slug,kind:'project',title:['ATLAS / ROVER','IRIS / VISION','PULSE / NETWORK','DEXTER / ARM'][i],summary:'A proposed CYGNUS build.',image:i%2?'/showcase-assets/vision.jpg':'/showcase-assets/rover.jpg',image_alt:'Concept',tags:['Robotics'],published:true,sort_order:i,data:{category:'robotics',status:'Concept',homeProject:true}}));
  for(const item of state.items)state.projectDetails[item.id]=Object.fromEntries(['overview','challenge','approach','features','techStack','milestones','nextSteps'].map(key=>[key,`Member-only ${key} for ${item.title}`]));
  await page.goto('/projects.html');
  await expect(page.locator('.experiment-card')).toHaveCount(4);
  const images=await page.locator('.experiment-image img').evaluateAll(nodes=>nodes.map(n=>n.src));
  expect(new Set(images).size).toBe(4);
  await expect(page.locator('[data-project-hero] a')).toHaveCount(3);
  await page.screenshot({path:info.outputPath('project-collection.png'),fullPage:true});
  for(const item of state.items){
    await page.goto(`/project.html?project=${item.slug}`);
    await expect(page.getByRole('heading',{level:1})).toHaveText(item.title);
    await expect(page.locator('#project-brief .project-section')).toHaveCount(7);
    await expect(page.locator('#project-github')).toBeHidden();
    await expect(page.getByText('Repository link coming soon.')).toBeVisible();
    await expect(page.locator('#project-image')).toHaveJSProperty('complete',true);
    expect(await page.locator('#project-image').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('#project-image')).toHaveAttribute('srcset', /640w, .*1280w/);
  }
  await page.setViewportSize({width:390,height:844});await page.goto('/projects.html');
  await expect(page.locator('[data-project-hero] a')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('project-collection-mobile.png'),fullPage:true});
  const detailCalls=state.calls.filter(c=>c.path.endsWith('/content_details')).length;
  await page.goto('/project.html?project=missing');
  await expect(page.getByRole('heading',{name:'Project not found.'})).toBeVisible();
  expect(state.calls.filter(c=>c.path.endsWith('/content_details')).length).toBe(detailCalls);
});

test('unsafe repository links cannot be saved or rendered',async({page})=>{
  const state=await mock(page,{signedIn:true});await page.goto('/admin');
  await page.getByRole('button',{name:'Projects',exact:true}).click();
  await page.getByRole('row').filter({hasText:'Atlas Rover'}).getByRole('button',{name:'Edit'}).click();
  await page.getByLabel('GitHub repository URL').fill('https://github.com.evil.test/owner/repo');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Use a GitHub repository URL');
  expect(state.calls.some(c=>c.path.endsWith('/rpc/save_content'))).toBe(false);
  state.projectDetails[projectId]={githubUrl:'javascript:alert(1)'};
  await page.goto('/project.html?project=atlas');
  await expect(page.getByRole('heading',{name:'Atlas Rover'})).toBeVisible();
  await expect(page.locator('#project-github')).toBeHidden();
  state.items.find(item=>item.id===projectId).data.projectUrl='javascript:alert(1)';
  await page.goto('/projects.html');
  await expect(page.getByRole('link',{name:'Explore Atlas Rover'})).toBeVisible();
  await expect(page.getByRole('link',{name:'VISIT LIVE ↗'})).toHaveCount(0);
});
test('approved member can read details, register once, update emoji, and cancel',async({page},info)=>{
  const state=await mock(page,{role:'member',signedIn:true});await page.goto('/events.html');await page.getByRole('button',{name:'View details for Future Build'}).click();await expect(page.getByText('Members-only instructions. Bring your robot kit.')).toBeVisible();
  await page.getByRole('button',{name:'REGISTER FOR EVENT',exact:true}).click();await expect(page.getByRole('button',{name:'YOU’RE REGISTERED'})).toBeDisabled();expect(state.registrations.length).toBe(1);
  await page.goto('/account');await expect(page.getByLabel('Pronouns (fixed)')).toHaveValue('He/Him');await expect(page.getByLabel('Pronouns (fixed)')).toHaveAttribute('readonly','');await expect(page.getByRole('group',{name:'Your tech emoji'}).getByRole('radio')).toHaveCount(8);await page.getByRole('radio',{name:'Rocket',exact:true}).check();await page.getByRole('button',{name:'Save profile',exact:true}).click();await expect.poll(()=>state.profile.avatar).toBe('rocket');expect(state.profile.pronouns).toBe('he/him');await expect(page.getByRole('img',{name:'Rocket',exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('robot-profile.png'),fullPage:true});
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect.poll(()=>state.registrations.length).toBe(0);
  await page.setViewportSize({width:375,height:812});await page.goto('/');await expect(page.locator('[data-mobile-account]').getByRole('img',{name:'Rocket',exact:true})).toBeVisible();
});
test('empty database never resurrects deleted items and mobile admin has no overflow',async({page},info)=>{
  await mock(page,{signedIn:true,empty:true});await page.goto('/');await expect(page.locator('.home-event-slide')).toHaveCount(0);await expect(page.locator('.project-card')).toHaveCount(0);
  await page.goto('/events.html');await expect(page.getByRole('heading',{name:'NO SIGNAL. YET.'})).toBeVisible();await expect(page.locator('.ev-ticket')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});await page.goto('/admin');await expect(page.getByRole('heading',{name:'Your club, at a glance.'})).toBeVisible();await expect(page.locator('body')).toHaveJSProperty('scrollWidth',390);await page.screenshot({path:info.outputPath('admin-mobile.png'),fullPage:true});
});
test('CMS text hooks resolve to the intended text without replacing child markup',async({page})=>{
  // These three homepage labels were intentionally cleared by the owner.
  await mock(page);for(const [path,prefix] of [['/','home-'],['/projects.html','projects-']]){
    await page.goto(path);await page.waitForLoadState('networkidle');
    const errors=await page.evaluate(slots=>slots.filter(s=>s.selector).flatMap(s=>{const el=document.querySelector(s.selector);if(!el)return [s.id+' missing'];if(s.type==='image')return [];const text=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE)[s.part];return (text?.textContent||'').trim().replace(/\s+/g,' ')===s.default?[]:[s.id+' incorrect text'];}),slots.filter(s=>s.id.startsWith(prefix)).map(s=>['home-001-0','home-002-0','home-007-0'].includes(s.id)?{...s,default:''}:s));
    expect(errors).toEqual([]);
  }
});

test('applications collect a chosen password and emoji without requesting admin privileges',async({page})=>{
  const state=await mock(page);await page.goto('/join.html');
  const password = page.getByLabel('Choose your password');
  await password.fill('a-long-test-password');
  await page.getByRole('button', {name:'Show password', exact:true}).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('a-long-test-password');
  await page.getByRole('button', {name:'Hide password', exact:true}).click();
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByLabel('First Name').fill('Sam');await page.getByLabel('Last Name').fill('Maker');await page.getByLabel('Mobile number',{exact:true}).fill('9876543210');await expect(page.getByLabel('Mobile number',{exact:true})).toHaveValue('98765 43210');await expect(page.locator('.mobile-prefix')).toHaveText('+91');await page.getByLabel('Email',{exact:true}).fill('sam@example.test');await page.getByLabel('Department',{exact:true}).selectOption('cs');await page.getByLabel('Year of Study').selectOption('2');await page.getByLabel('Why do you want to join CYGNUS?').fill('I want to learn robotics.');await page.getByLabel('Choose your password').fill('a-long-test-password');await page.getByRole('radio',{name:'She/Her',exact:true}).check();await page.getByRole('radio',{name:'Satellite',exact:true}).check();await page.getByRole('button',{name:'SUBMIT APPLICATION'}).click();
  await expect(page.getByRole('status')).toContainText('Open the confirmation link');
  const signup=state.calls.find(c=>c.path.endsWith('/signup')).body;
  expect(signup.data.mobile_number).toBe('+919876543210');expect(signup.data.avatar).toBe('satellite');expect(signup.data.pronouns).toBe('she/her');expect(state.calls.find(c=>c.path.endsWith('/signup')).url).toContain('redirect_to=https%3A%2F%2Fsaclub.tech%2Faccount%3Fmode%3Dlogin%26confirmed%3D1');expect(signup.data.name).toBe('Sam Maker');expect(signup.data.role).toBeUndefined();expect(signup.data.status).toBeUndefined();
});

test('pending member cannot open protected details and gets a useful status',async({page})=>{
  const state=await mock(page,{role:'member',signedIn:true,status:'pending'});await page.goto('/events.html');await page.getByRole('button',{name:'View details for Future Build'}).click();await expect(page).toHaveURL(/\/account/);await expect(page.getByRole('status')).toContainText('awaiting admin approval');expect(state.calls.filter(c=>c.path.endsWith('/content_details')).length).toBe(0);
});

test('edited event banner words and home button words persist without changing banner artwork',async({page})=>{
  const state=await mock(page,{signedIn:true});state.values['events-006']='BUILD YOUR NEXT';state.values['home-009-0']='DISCOVER THE LAB';state.values['home-010-0']='JOIN OUR CLUB';await page.goto('/events.html');await expect(page.locator('#ev-title')).toContainText('BUILD YOUR NEXT');await expect(page.locator('.ev-hero-image')).toHaveAttribute('src',/banner_notext/);
  await page.goto('/');const button=page.locator('[data-cms="home-009"]');await expect(button).toHaveText('DISCOVER THE LAB');await button.hover();await page.mouse.move(0,0);await expect(button).toHaveText('DISCOVER THE LAB');
  await page.evaluate(async()=>{const {supabase}=await import('/lib/supabase.js');await supabase.auth.signOut();});
  await expect(button).toBeVisible();await page.setViewportSize({width:375,height:812});
  await expect(button).toBeHidden();const join=page.locator('[data-cms="home-010"]');await expect(join).toBeVisible();await expect(join).toHaveAttribute('href','join.html');await expect(join).toHaveText('JOIN OUR CLUB');await join.hover();await page.mouse.move(0,0);await expect(join).toHaveText('JOIN OUR CLUB');
});


test('admin keeps the laptop-person emoji and cannot select a member emoji',async({page})=>{
  await mock(page,{signedIn:true});await page.goto('/account');
  await expect(page.getByRole('img',{name:'Administrator technologist'})).toBeVisible();
  await expect(page.getByRole('group',{name:'Your tech emoji'})).toHaveCount(0);
  await expect(page.getByLabel('Pronouns (fixed)')).toHaveAttribute('readonly','');
  await page.goto('/admin');
  await expect(page.locator('.admin-user').getByRole('img',{name:'Administrator technologist'})).toBeVisible();
});

test('confirmed email lands on login and failed links do not claim success',async({page})=>{
  const state=await mock(page,{role:'member',signedIn:true});
  await page.goto('/account?mode=login&confirmed=1');
  await expect(page.getByRole('heading',{name:'Good to see you.'})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Email confirmed. Sign in');
  expect(state.calls.some(c=>c.path.includes('/logout')&&c.url.includes('scope=local'))).toBe(true);
  await expect(page).toHaveURL(/account\?mode=login$/);
  await page.goto('/account?mode=login&confirmed=1#error=access_denied&error_description=Email+link+expired');
  await expect(page.getByRole('alert')).toContainText('Email link expired');
  await expect(page.getByText('Email confirmed. Sign in to your account.')).toHaveCount(0);
});

test('publishing requirement and emoji choices fit mobile and each page theme',async({page},info)=>{
  await mock(page,{role:'member',signedIn:true,status:'pending'});
  await page.addInitScript(()=>sessionStorage.setItem('sac_booted','true'));
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    for(const path of ['/account','/projects.html','/about.html','/terms.html','/privacy.html']){
      await page.goto(path);
      await expect(page.getByText(/All projects developed under CYGNUS must be published/)).toBeVisible();
      await expect(page.getByRole('link',{name:'club’s official GitHub organization'})).toHaveAttribute('href','https://github.com/SAclub');
      await expect.poll(()=>page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main > section')].filter(el=>el.getBoundingClientRect().right>innerWidth).map(el=>el.className)})),{message:`Layout at ${path}, ${width}px`}).toEqual({width,scrollWidth:width,overflow:[]});
      await page.getByText(/All projects developed under CYGNUS must be published/).scrollIntoViewIfNeeded();
      await page.screenshot({path:info.outputPath(`${path.replaceAll('/','')}-${width}.png`)});
    }
  }
  await page.goto('/join.html');
  await expect(page.getByRole('group',{name:'Your tech emoji'}).getByRole('radio')).toHaveCount(8);
  await expect(page.getByRole('radio',{name:'He/Him',exact:true})).toBeDisabled();
  await page.getByRole('group',{name:'Your tech emoji'}).scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('join-choices-mobile.png')});
});

test('guest project navigation bypasses the detail page and timed loaders',async({page})=>{
  const state=await mock(page);
  const documents=[];page.on('request',request=>{if(request.resourceType()==='document')documents.push(new URL(request.url()).pathname);});
  await page.goto('/projects.html');
  await expect(page.locator('#sac-global-loader')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Explore Atlas Rover'})).toBeVisible();
  await page.getByRole('link',{name:'Explore Atlas Rover'}).click();
  await expect(page.getByRole('heading',{name:'Good to see you.'})).toBeVisible();
  expect(documents).not.toContain('/project.html');
  expect(new URL(page.url()).searchParams.get('next')).toBe('/project.html?project=atlas');
  expect(state.calls.some(call=>call.path.includes('/auth/v1/user')||call.path.endsWith('/content_details'))).toBe(false);
  const bundles=[];page.on('request',request=>bundles.push(request.url()));
  await page.goto('/project.html?project=atlas');
  await expect(page).toHaveURL(/\/account\?next=/);
  expect(bundles.some(url=>url.includes('/project-detail.js'))).toBe(false);
});

test('project controls and cards do not wait for website copy',async({page})=>{
  await mock(page);
  await page.route('**/rest/v1/site_content?**',()=>{});
  await page.setViewportSize({width:390,height:844});
  await page.goto('/projects.html');
  await page.getByRole('button',{name:'Open navigation'}).click();
  await expect(page.getByRole('button',{name:'Close navigation'})).toHaveAttribute('aria-expanded','true');
  await expect(page.getByRole('link',{name:'Explore Atlas Rover'})).toBeVisible();
  await page.getByRole('button',{name:'AI & vision',exact:true}).click();
  await expect(page.locator('.filter-count')).toHaveText('0 concepts');
});

test('public event opens and closes immediately even with a slow detail request',async({page})=>{
  const state=await mock(page);state.items[0].data.access='public';
  await page.route('**/rest/v1/content_details?**',()=>{});
  await page.goto('/events.html');
  await page.getByRole('button',{name:'View details for Future Build'}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Loading event details');
  await page.getByRole('button',{name:'Close event details'}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/events.html$/);
});

test('admin can switch event details between public and members only',async({page})=>{
  const state=await mock(page,{signedIn:true});await page.goto('/admin');
  await page.getByRole('button',{name:'Events',exact:true}).click();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await expect(page.getByLabel('Event access')).toHaveValue('members');
  await page.getByLabel('Event access').selectOption('public');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect.poll(()=>state.items.find(i=>i.kind==='event').data.access).toBe('public');
  const guest=await page.context().browser().newPage();
  try {
    const guestState=await mock(guest);guestState.items=state.items;
    await guest.goto(new URL('/events.html?event=future-build', page.url()).href);
    await expect(guest.getByRole('dialog')).toContainText(state.privateBody);
    await guest.getByRole('button',{name:'Close event details'}).click();
    await expect(guest.getByRole('dialog')).not.toBeVisible();
    await page.getByRole('button',{name:'Edit',exact:true}).click();
    await page.getByLabel('Event access').selectOption('members');
    await page.getByRole('button',{name:'Save changes',exact:true}).click();
    await expect.poll(()=>state.items.find(i=>i.kind==='event').data.access).toBe('members');
    guestState.items=state.items;
    await guest.reload();
    await expect(guest).toHaveURL(/\/account\?next=/);
    expect(new URL(guest.url()).searchParams.get('next')).toBe('/events.html?event=future-build');
  } finally { await guest.close(); }
});

for (const width of [390,1440]) test(`team names reveal contact details inside their category at ${width}px`,async({page},info)=>{
  const state=await mock(page);
  state.values['team-person-one']=JSON.stringify({name:'Avery Test',group:'hardware',email:'avery@example.test',linkedin:'https://www.linkedin.com/in/avery-test/'});
  state.values['team-person-two']=JSON.stringify({name:'Robin Test',group:'hardware',email:'',linkedin:''});
  state.values['team-person-three']=JSON.stringify({name:'Taylor Test',group:'design',email:'taylor@example.test',linkedin:'https://linkedin.com.evil.test/in/taylor'});
  await page.setViewportSize({width,height:844});
  await page.goto('/team.html');
  const trigger=page.getByRole('button',{name:'Meet the Builders',exact:true});
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'The Builders',exact:true});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Avery Test',exact:true})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Taylor Test',exact:true})).toHaveCount(0);
  await expect(dialog.getByRole('link')).toHaveCount(0);
  const name=dialog.getByRole('button',{name:'Avery Test',exact:true});
  await name.focus();await page.keyboard.press('Enter');
  await expect(name).toHaveAttribute('aria-expanded','true');
  await expect(dialog.getByRole('link',{name:'avery@example.test',exact:true})).toHaveAttribute('href','mailto:avery%40example.test');
  const linkedin=dialog.getByRole('link',{name:'linkedin.com/in/avery-test/'});
  await expect(linkedin).toHaveAttribute('href','https://www.linkedin.com/in/avery-test/');
  await expect(linkedin).toHaveAttribute('rel','noopener noreferrer');
  await page.screenshot({path:info.outputPath(`team-contact-${width}.png`)});
  const box=await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
  expect(box.y+box.height).toBeLessThanOrEqual(844);
  await dialog.getByRole('button',{name:'Robin Test',exact:true}).click();
  await expect(name).toHaveAttribute('aria-expanded','false');
  await expect(dialog.getByText('Contact details will be added soon.')).toBeVisible();
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
  await page.getByRole('button',{name:'Meet the Shapers',exact:true}).click();
  await page.getByRole('button',{name:'Taylor Test',exact:true}).click();
  await expect(page.locator('#team-directory').getByRole('link')).toHaveCount(1);
  await page.getByRole('button',{name:'Close team',exact:true}).click();
  await expect(page.getByRole('button',{name:'Meet the Shapers',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Meet the Thinkers',exact:true}).click();
  await expect(page.getByText('The Thinkers lineup will appear here soon.')).toBeVisible();
  await page.mouse.click(2,2);await expect(page.locator('#team-directory')).not.toBeVisible();
});

test('admin can publish, edit, move and remove public team people',async({page},info)=>{
  const state=await mock(page,{signedIn:true});
  state.values.unrelated_setting='keep me';
  const openTeam = async () => {
    await page.goto('/admin');
    await expect(page.locator('.admin-shell')).toBeVisible();
    const menu = page.getByRole('button', {name:'Open admin navigation'});
    if (await menu.isVisible()) await menu.click();
    await page.getByRole('button', {name:'Team', exact:true}).click();
  };
  await openTeam();
  await page.getByRole('button',{name:'Add person',exact:true}).click();
  await page.getByLabel('Full name',{exact:true}).fill('Avery Test');
  await page.getByLabel('Public email (optional)',{exact:true}).fill('avery@example.test');
  await page.getByLabel('LinkedIn profile URL (optional)',{exact:true}).fill('https://linkedin.com.evil.test/in/avery');
  await page.getByRole('button',{name:'Publish person',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Enter a LinkedIn profile link');
  await page.getByLabel('LinkedIn profile URL (optional)',{exact:true}).fill('in.linkedin.com/in/avery-test/?utm_source=share');
  const preview=page.getByRole('link',{name:'Open LinkedIn profile'});
  await expect(preview).toHaveAttribute('href','https://www.linkedin.com/in/avery-test/');
  await page.context().route('https://www.linkedin.com/in/avery-test/',route=>route.fulfill({contentType:'text/html',body:'<title>LinkedIn test destination</title>'}));
  const opened=page.waitForEvent('popup');
  await preview.click();
  const profileTab=await opened;
  await expect(profileTab).toHaveURL('https://www.linkedin.com/in/avery-test/');
  await profileTab.close();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:info.outputPath('team-editor-mobile.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Publish person',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Avery Test is now listed on the Team page.');
  const id=Object.keys(state.values).find(key=>key.startsWith('team-person-'));
  expect(JSON.parse(state.values[id]).group).toBe('hardware');
  expect(JSON.parse(state.values[id]).linkedin).toBe('https://www.linkedin.com/in/avery-test/');
  await page.goto('/team.html');await page.getByRole('button',{name:'Meet the Builders',exact:true}).click();
  await expect(page.getByRole('button',{name:'Avery Test',exact:true})).toBeVisible();
  await openTeam();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByLabel('Team category',{exact:true}).selectOption('design');
  await page.getByLabel('Public email (optional)',{exact:true}).fill('design@example.test');
  await page.getByRole('button',{name:'Save person',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Avery Test is now listed on the Team page.');
  await page.goto('/team.html');await page.getByRole('button',{name:'Meet the Builders',exact:true}).click();
  await expect(page.getByText('The Builders lineup will appear here soon.')).toBeVisible();
  await page.getByRole('button',{name:'Close team',exact:true}).click();
  await page.getByRole('button',{name:'Meet the Shapers',exact:true}).click();
  await page.getByRole('button',{name:'Avery Test',exact:true}).click();
  await expect(page.getByRole('link',{name:'design@example.test',exact:true})).toBeVisible();
  await openTeam();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Remove person',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Person removed from the Team page.');
  expect(state.values[id]).toBeUndefined();expect(state.values.unrelated_setting).toBe('keep me');
});

test('team popup reports a load failure and can retry without reopening',async({page})=>{
  await mock(page);let attempts=0;
  await page.route('**/rest/v1/site_content?*',route=>{
    const url=new URL(route.request().url());
    if(!url.searchParams.get('id')?.startsWith('like.team-person-'))return route.fallback();
    attempts++;
    return route.fulfill({status:attempts===1?403:200,contentType:'application/json',body:JSON.stringify(attempts===1?{message:'Unavailable'}:[])});
  });
  await page.goto('/team.html');await page.getByRole('button',{name:'Meet the Connectors',exact:true}).click();
  await expect(page.getByText('The team list couldn’t load. Please try again.')).toBeVisible();
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByText('The Connectors lineup will appear here soon.')).toBeVisible();
});

test('applications and members are separate through approval, suspension and restoration',async({page},info)=>{
  const state=await mock(page,{signedIn:true});
  state.extraProfiles=[{...state.applicant,id:'incomplete',name:'Incomplete Maker',submitted_at:null},{...state.applicant,id:'rejected',name:'Rejected Maker',status:'rejected'}];
  await page.goto('/admin');
  await page.getByRole('button',{name:'View all',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Applications',exact:true})).toBeVisible();
  await expect(page.getByText('Alex Admin',{exact:true})).toHaveCount(0);
  await page.getByLabel('Filter applications').selectOption('incomplete');
  await expect(page.getByText('Incomplete Maker',{exact:true})).toBeVisible();
  await expect(page.locator('.member-list-row strong').filter({hasText:/^New Maker$/})).toHaveCount(0);
  await page.getByLabel('Filter applications').selectOption('rejected');
  await expect(page.getByText('Rejected Maker',{exact:true})).toBeVisible();
  await page.getByLabel('Filter applications').selectOption('pending');
  await page.getByLabel('Accept club applications').uncheck();
  await expect.poll(()=>state.values.applications_open).toBe('false');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByLabel('Accept club applications')).not.toBeChecked();
  await page.getByRole('button',{name:'Review',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Approve & assign ID'}).click();
  await expect(page.locator('.member-list-row strong').filter({hasText:/^New Maker$/})).toHaveCount(0);
  await page.getByRole('button',{name:'Members',exact:true}).click();
  await page.getByLabel('Search members').fill('CYG-CS-002');
  await expect(page.locator('.member-list-row strong').filter({hasText:/^New Maker$/})).toBeVisible();
  await expect(page.getByText('Incomplete Maker',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Manage',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Suspend access',exact:true}).click();
  await expect.poll(()=>state.applicant.status).toBe('suspended');
  await page.getByLabel('Filter members').selectOption('suspended');
  await expect(page.locator('.member-list-row strong').filter({hasText:/^New Maker$/})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Restore access',exact:true}).click();
  await expect.poll(()=>state.applicant.status).toBe('approved');
  await page.getByLabel('Filter members').selectOption('approved');
  await expect(page.locator('.member-list-row strong').filter({hasText:/^New Maker$/})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:info.outputPath('separate-members-mobile.png'),fullPage:true});
});

test('team department filters and saved display order control the public lineup',async({page},info)=>{
  const state=await mock(page,{signedIn:true});
  state.values['team-person-a']=JSON.stringify({name:'Alpha Maker',group:'hardware',sort_order:1});
  state.values['team-person-z']=JSON.stringify({name:'Zeta Maker',group:'hardware',sort_order:2});
  state.values['team-person-d']=JSON.stringify({name:'Design Maker',group:'design',sort_order:0});
  await page.goto('/admin');
  await page.getByRole('button',{name:'Team',exact:true}).click();
  await expect(page.getByRole('heading',{name:'The Builders',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'The Shapers',exact:true})).toBeVisible();
  await page.getByLabel('Filter team by department').selectOption('hardware');
  await expect(page.getByText('Design Maker',{exact:true})).toHaveCount(0);
  await page.getByRole('row').filter({hasText:'Zeta Maker'}).getByRole('button',{name:'Edit'}).click();
  await page.getByLabel('Display order',{exact:true}).fill('0');
  await page.getByRole('button',{name:'Save person',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Zeta Maker is now listed');
  expect(JSON.parse(state.values['team-person-z']).sort_order).toBe(0);
  await expect(page.locator('tbody tr').first()).toContainText('Zeta Maker');
  await page.getByLabel('Search team').fill('Alpha');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Search team').fill('');
  await page.screenshot({path:info.outputPath('team-department-order.png'),fullPage:true});
  await page.getByLabel('Filter team by department').selectOption('design');
  await page.getByRole('button',{name:'Add person',exact:true}).click();
  await expect(page.getByLabel('Team category',{exact:true})).toHaveValue('design');
  await expect(page.getByLabel('Display order',{exact:true})).toHaveValue('0');
  await page.goto('/team.html');
  await page.getByRole('button',{name:'Meet the Builders',exact:true}).click();
  await expect(page.locator('.team-person-name')).toHaveText(['Zeta Maker+','Alpha Maker+']);
});

async function scanMemberQR(page) {
  const image=page.getByRole('img',{name:/QR code with member details/});
  await expect(image).toBeVisible();
  await image.evaluate(img => img.decode());
  // Scan the actual rendered pixels, including browser resizing at phone widths.
  const screenshot = await image.screenshot();
  const pixels = await page.evaluate(async base64 => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(img, 0, 0);
    return {data:Array.from(context.getImageData(0,0,canvas.width,canvas.height).data),width:canvas.width,height:canvas.height};
  }, screenshot.toString('base64'));
  return jsQR(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height)?.data;
}

test('member mobile numbers and downloaded QR codes use saved details at mobile size',async({page},info)=>{
  const state=await mock(page,{role:'member',signedIn:true});
  await page.setViewportSize({width:390,height:844});await page.goto('/account');
  await expect(page.getByLabel('Mobile number',{exact:true})).toHaveValue('98765 43210');
  expect(await scanMemberQR(page)).toBe('CYGNUS-MEMBER|CYG-CS-001|11111111-1111-4111-8111-111111111111');
  const originalCard = await page.locator('.member-id-front').getAttribute('src');
  expect(await page.getByLabel('Mobile number',{exact:true})).toBeDisabled();
  await page.getByLabel('Name',{exact:true}).fill('Jamie Updated');
  await page.getByRole('button',{name:'Save profile',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Profile updated.');
  expect(state.profile.mobile_number).toBe('+919876543210');
  expect(await scanMemberQR(page)).toBe('CYGNUS-MEMBER|CYG-CS-001|11111111-1111-4111-8111-111111111111');
  await expect(page.locator('.member-id-front')).toHaveAttribute('alt', /Jamie Updated.*CLUB MEMBER/);
  expect(await page.locator('.member-id-front').getAttribute('src')).not.toBe(originalCard);
  const download=page.waitForEvent('download');
  await page.getByRole('link',{name:'Download member card'}).click();
  const cardDownload = await download;
  expect(cardDownload.suggestedFilename()).toBe('CYG-CS-001-card.png');
  await cardDownload.saveAs(info.outputPath('downloaded-member-card.png'));
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth',390);
  await page.screenshot({path:info.outputPath('member-mobile-qr.png'),fullPage:true});
});

test('admin sees application mobile contacts and approved member QR details',async({page},info)=>{
  const state=await mock(page,{signedIn:true});await page.goto('/admin');
  await page.getByRole('button',{name:/^Applications/}).click();
  await expect(page.getByRole('link',{name:'+91 98765 43210',exact:true})).toHaveAttribute('href','tel:+919876543210');
  await page.getByRole('button',{name:'Review',exact:true}).click();
  await expect(page.getByRole('region',{name:'Member QR card'})).toHaveCount(0);
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Approve & assign ID'}).click();
  await expect.poll(()=>state.applicant.status).toBe('approved');
  await page.getByRole('button',{name:'Members',exact:true}).click();
  await page.getByLabel('Search members').fill('New Maker');
  await page.getByRole('button',{name:'Manage',exact:true}).click();
  await expect(page.getByRole('region',{name:'Member QR card'})).toHaveCount(0);
  await page.getByRole('button',{name:'Verify QR',exact:true}).click();
  await expect(page.getByRole('region',{name:'Verify a CYGNUS member QR code'})).toBeVisible();
  await page.screenshot({path:info.outputPath('admin-member-contact.png'),fullPage:true});
});

test('legacy members add their missing mobile before receiving a QR card',async({page})=>{
  const state=await mock(page,{role:'member',signedIn:true});state.profile.mobile_number=null;
  await page.goto('/account');
  await expect(page.getByText('Save your mobile number in your profile to create your QR card.')).toBeVisible();
  await expect(page.getByRole('img',{name:/QR code with member details/})).toHaveCount(0);
  await page.getByLabel('Mobile number',{exact:true}).fill('9876543210');
  await page.getByRole('button',{name:'Save profile',exact:true}).click();
  expect(await scanMemberQR(page)).toContain('CYGNUS-MEMBER|CYG-CS-001|11111111-1111-4111-8111-111111111111');
});

test('OAuth application requires and saves a mobile number; suspended members have no QR card',async({page})=>{
  const state=await mock(page,{role:'member',signedIn:true,status:'pending'});state.profile.submitted_at=null;state.profile.mobile_number=null;
  await page.goto('/account');
  await page.getByLabel('Mobile number',{exact:true}).fill('+91 91234 56789');
  await page.getByRole('combobox',{name:'Department',exact:true}).selectOption('cs');
  await page.getByLabel('Year of study',{exact:true}).fill('2');
  await page.getByLabel('Why would you like to join?').fill('Build robots');
  await page.getByRole('button',{name:'Submit application',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Your application is now with the admin team.'})).toBeVisible();
  expect(state.calls.find(call=>call.path.endsWith('/rpc/submit_application')).body.contact_number).toBe('+919123456789');
  state.profile.status='suspended';await page.reload();
  await expect(page.getByRole('region',{name:'Member QR card'})).toHaveCount(0);
});

for (const [role, label] of [['member', 'CLUB MEMBER'], ['core_member', 'CORE MEMBER'], ['admin', 'CLUB ADMIN']]) {
  test(`front card uses the correct ${role} label and a scannable QR`, async ({page}, info) => {
    await mock(page, {role, signedIn:true});
    await page.goto('/account');
    const card = page.locator('.member-id-front');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('alt', new RegExp(label));
    expect(await scanMemberQR(page)).toBe('CYGNUS-MEMBER|CYG-CS-001|11111111-1111-4111-8111-111111111111');
    await card.screenshot({path:info.outputPath(`${role}-card.png`)});
    for (const width of [390, 320]) {
      await page.setViewportSize({width, height:844});
      expect(await scanMemberQR(page)).toBe('CYGNUS-MEMBER|CYG-CS-001|11111111-1111-4111-8111-111111111111');
    }
    await card.screenshot({path:info.outputPath(`${role}-card-mobile.png`)});
  });
}

test('logo QR remains scannable for different member tokens and long details', async ({page}, info) => {
  const state = await mock(page, {role:'member', signedIn:true});
  await page.setViewportSize({width:320, height:844});
  for (const [index, [memberId, token, name]] of [
    ['CYG-ECE-128', '9cb772a1-8c33-4d60-a591-ec057651fe9f', 'Ananya Krishnamurthy'],
    ['CYG-OTHER-10000', '5084ac6f-a9e6-49be-861d-af3279e6a518', 'Alexandra Catherine Montgomery'],
    ['CYG-ME-999', 'f44a2bb8-3d12-46e7-890a-e53852dbfc6e', 'Jamie Member'],
  ].entries()) {
    Object.assign(state.profile, {member_id:memberId, qr_token:token, name});
    await page.goto('/account');
    expect(await scanMemberQR(page)).toBe(`CYGNUS-MEMBER|${memberId}|${token}`);
    await page.locator('.member-id-front').screenshot({path:info.outputPath(`logo-qr-${index}.png`)});
  }
});

for (const [path, role, heading] of [['/account', 'member', 'Hello, Jamie.'], ['/admin', 'admin', 'Your club, at a glance.']]) {
  test(`${role} portal remembers dark mode and keeps controls usable`, async ({page}, info) => {
    await mock(page, {role, signedIn:true});
    await page.goto(path);
    await expect(page.getByRole('heading', {name:heading})).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-portal-theme', 'light');
    if (role === 'member') {
      await expect(page.locator('body')).toHaveClass(/member-portal/);
      await expect(page.locator('body')).toHaveCSS('background-image', /radial-gradient/);
      await expect(page.locator('.member-gradient-canvas')).toBeVisible();
      await expect(page.locator('.member-identity strong')).toHaveText('CYG-CS-001');
      expect(await page.locator('.member-identity strong').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(22);
    } else {
      await expect(page.locator('body')).not.toHaveClass(/member-portal/);
      await expect(page.locator('.member-portal-background')).toHaveCount(0);
      await expect(page.locator('body')).toHaveCSS('background-image', 'none');
    }
    await page.getByRole('button', {name:'Dark mode', exact:true}).click();
    await expect(page.locator('body')).toHaveCSS('background-color', role === 'member' ? 'rgb(9, 10, 12)' : 'rgb(16, 21, 19)');
    await page.reload();
    await expect(page.getByRole('button', {name:'Light mode', exact:true})).toBeVisible();
    if (role === 'member') {
      await expect(page.getByLabel('Name', {exact:true})).toHaveCSS('background-color', 'rgb(28, 31, 37)');
      await page.getByRole('button', {name:'Get merchandise'}).click();
      await expect(page.getByRole('status')).toContainText('CYGNUS merchandise is coming soon.');
      expect(await scanMemberQR(page)).toContain('CYGNUS-MEMBER|CYG-CS-001|');
    } else {
      await page.getByRole('button', {name:'Members', exact:true}).click();
      await expect(page.getByRole('heading', {name:'Members', exact:true})).toBeVisible();
    }
    await page.screenshot({path:info.outputPath(`${role}-dark-desktop.png`), fullPage:true});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Let the responsive sidebar finish moving before checking its appearance.
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:info.outputPath(`${role}-dark-mobile.png`)});
    if (role === 'member') await page.locator('.member-qr').screenshot({path:info.outputPath('member-dark-card.png')});
    await page.getByRole('button', {name:'Light mode', exact:true}).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-portal-theme', 'light');
    if (role === 'member') {
      await page.screenshot({path:info.outputPath('member-light-mobile.png'), fullPage:true});
      await page.goto('/account?mode=reset');
      await expect(page.getByRole('heading', {name:'Choose a new password.'})).toBeVisible();
      await expect(page.locator('body')).not.toHaveClass(/member-portal/);
      await expect(page.locator('.member-portal-background')).toHaveCount(0);
      await expect(page.locator('body')).toHaveCSS('background-image', 'none');
      await page.goto('/account');
      await page.getByRole('button', {name:'Sign out', exact:true}).click();
      await expect(page.getByRole('heading', {name:'Good to see you.'})).toBeVisible();
      await expect(page.locator('body')).not.toHaveClass(/member-portal/);
      await expect(page.locator('.member-portal-background')).toHaveCount(0);
      await expect(page.locator('body')).toHaveCSS('background-image', 'none');
    }
  });
}
