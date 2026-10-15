import test from 'node:test';
import assert from 'node:assert/strict';
import { teamLinkedIn, decodeTeamRows } from '../lib/team-data.mjs';

test('team LinkedIn links accept pasted profile URL formats and normalize to HTTPS',()=>{
  for(const input of [
    'https://www.linkedin.com/in/example-person/',
    'linkedin.com/in/example-person/',
    'www.linkedin.com/in/example-person/',
    'https://in.linkedin.com/in/example-person/',
    'http://www.linkedin.com/in/example-person/',
    '  HTTPS://WWW.LINKEDIN.COM/in/example-person/?utm_source=share#contact  ',
  ]) assert.equal(teamLinkedIn(input),'https://www.linkedin.com/in/example-person/',input);
  assert.equal(teamLinkedIn('linkedin.com/in/example-person'),'https://www.linkedin.com/in/example-person');
});

test('team LinkedIn links reject other destinations and non-profile URLs',()=>{
  for(const input of [null,undefined,'','javascript:alert(1)','https://evil.test/in/person',
    'https://linkedin.com.evil.test/in/person','https://fakelinkedin.com/in/person',
    'https://linkedin.com@evil.test/in/person','https://user@linkedin.com/in/person',
    'https://linkedin.com:444/in/person','https://linkedin.com/in/','https://linkedin.com/company/example',
    'https://linkedin.com/in/example person',
    'https://linked\nin.com/in/person','https://linkedin.com\\@evil.test/in/person',
  ]) assert.equal(teamLinkedIn(input),'',String(input));
});

test('existing regional and scheme-less saved links display correctly in the public directory',()=>{
  const people=decodeTeamRows([{id:'team-person-test',value:JSON.stringify({name:'Example Person',group:'hardware',linkedin:'in.linkedin.com/in/example-person/'})}]);
  assert.equal(people[0].linkedin,'https://www.linkedin.com/in/example-person/');
});

test('team order sorts numerically with alphabetical ties and safe legacy defaults',()=>{
  const row=(id,name,sort_order)=>({id:`team-person-${id}`,value:JSON.stringify({name,group:'hardware',sort_order})});
  const people=decodeTeamRows([row('ten','Ten',10),row('two','Two',2),row('one','One',1),row('zero','Zero',0),row('legacy','Legacy'),row('invalid','Invalid',-1),row('fraction','Fraction',1.5)]);
  assert.deepEqual(people.map(person=>person.name),['Fraction','Invalid','Legacy','Zero','One','Two','Ten']);
  assert.deepEqual(people.map(person=>person.sort_order),[0,0,0,0,1,2,10]);
});
