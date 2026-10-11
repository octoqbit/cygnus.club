import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareProject, githubRepositoryURL, projectURL } from '../lib/project-data.mjs';

test('project defaults preserve edits, cleared sections, and custom images',()=>{
  const original={kind:'project',slug:'rover',image:'/showcase-assets/rover.jpg',data:{}};
  assert.match(prepareProject(original).image,/project-atlas/);
  assert.equal(prepareProject(original).data.overview,undefined);
  assert.equal(prepareProject(original).data.githubUrl,undefined);
  const edited={...original,image:'https://images.example.test/my-photo.jpg',data:{overview:'My build',features:'',githubUrl:'https://github.com/example/robot'}};
  assert.equal(prepareProject(edited).image,edited.image);
  assert.equal(prepareProject(edited).data.overview,'My build');
  assert.equal(prepareProject(edited).data.features,'');
  assert.equal(prepareProject(edited).data.githubUrl,edited.data.githubUrl);
});

test('repository links require a real GitHub HTTPS origin and repository-shaped path',()=>{
  assert.equal(githubRepositoryURL('https://github.com/example/robot'),'https://github.com/example/robot');
  for(const value of ['',null,'javascript:alert(1)','https://github.com.evil.test/a/b','https://github.com@evil.test/a/b','https://user:pass@github.com/a/b','http://github.com/a/b','https://github.com/owner','https://github.com:444/a/b'])assert.equal(githubRepositoryURL(value),'',String(value));
});

test('projectURL accepts valid live website and project links while rejecting unsafe ones',()=>{
  assert.equal(projectURL('https://tivzo.saclub.tech/'),'https://tivzo.saclub.tech/');
  assert.equal(projectURL('https://example.com'),'https://example.com/');
  assert.equal(projectURL('http://sub.domain.org/path'),'http://sub.domain.org/path');
  for(const value of ['',null,undefined,'javascript:alert(1)','data:text/html,test','ftp://example.com'])assert.equal(projectURL(value),'');
});
