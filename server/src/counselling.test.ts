import request from 'supertest';
import { createApp } from './app';
import { signToken } from './middleware/auth';
import {
  CounsellingService as C,
  counsellingTransaction,
} from './services/counselling.service';
import {
  AdmissionRound,
  Application,
  Programme,
  SeatAllotment,
  User,
  Payment,
  QRGatePass,
  VerificationCounter,
} from './models';
import { setupTestDb, clearTestDb, teardownTestDb } from './test/test-db';
import { SeatResponse } from '@sams/shared';

jest.setTimeout(120000);
beforeAll(setupTestDb);
afterEach(clearTestDb);
afterAll(teardownTestDb);
async function applicant(rank: number, preferences: any[]) {
  const user = await User.create({
    email: `a${rank}@test.com`,
    fullName: `Applicant ${rank}`,
    passwordHash: 'test',
    role: 'Applicant',
    verified: true,
  });
  const app = await Application.create({
    userId: user._id,
    locked: true,
    status: 'Submitted',
    admissionStage: 'Submitted',
    meritRank: rank,
    preferences: preferences.map((p, i) => ({
      programmeId: p._id,
      preferenceOrder: i + 1,
    })),
  });
  return { user, app };
}
async function round(final = false) {
  return (
    await C.createRound({
      name: 'Regular round',
      responseDeadline: new Date(Date.now() + 86400000),
      withdrawalDeadline: new Date(Date.now() + 172800000),
      isFinal: final,
    })
  ).round;
}
async function active(a: any) {
  return SeatAllotment.findOne({
    applicationId: a.app._id,
    isActive: true,
    publication: 'Published',
    result: 'Allotted',
  });
}
async function close(id: any) {
  await AdmissionRound.updateOne(
    { _id: id },
    { responseDeadline: new Date(Date.now() - 1000) },
  );
  await C.expireDue();
}

it('retains Float backups, cascades upgrades, carries payment, and releases only the current seat on withdrawal', async () => {
  const counter = await VerificationCounter.create({
    name: 'Counter',
    location: 'Hall',
  });
  const faculty = await User.create({
    email: 'faculty@test.com',
    fullName: 'Faculty',
    passwordHash: 'test',
    role: 'FacultyVerifier',
    verified: true,
    assignedCounterId: counter._id,
  });
  const token = signToken({
    id: String(faculty._id),
    email: faculty.email,
    role: faculty.role,
  });
  const cse = await Programme.create({
    code: 'CSE',
    name: 'CSE',
    fee: 160000,
    baseCapacity: 1,
  });
  const ece = await Programme.create({
    code: 'ECE',
    name: 'ECE',
    fee: 160000,
    baseCapacity: 1,
  });
  const me = await Programme.create({
    code: 'ME',
    name: 'ME',
    fee: 160000,
    baseCapacity: 1,
  });
  const first = await applicant(1, [cse]);
  const second = await applicant(2, [cse, ece]);
  const third = await applicant(3, [ece, me]);
  const fourth = await applicant(4, [me]);
  const r1 = await round();
  await C.allocate(String(r1._id));
  await C.publish(String(r1._id));
  for (const a of [first, second, third]) {
    await C.respond(
      String((await active(a))!._id),
      String(a.user._id),
      SeatResponse.OptedNextRound,
    );
    await C.pay(String(a.user._id), 'success');
  }
  await Promise.all([
    C.pay(String(second.user._id), 'success'),
    C.pay(String(second.user._id), 'success'),
  ]);
  expect(
    await Payment.countDocuments({
      applicationId: second.app._id,
      status: 'Success',
    }),
  ).toBe(1);
  await C.withdraw(String(first.user._id));
  await close(r1._id);
  const r2 = await round();
  await C.allocate(String(r2._id));
  await C.publish(String(r2._id));
  expect(String((await active(second))!.programmeId)).toBe(String(cse._id));
  expect(String((await active(third))!.programmeId)).toBe(String(ece._id));
  expect(String((await active(fourth))!.programmeId)).toBe(String(me._id));
  const pass = await QRGatePass.findOne({ applicationId: second.app._id });
  const scan = await request(createApp())
    .post('/api/v1/verify/scan')
    .set('Authorization', 'Bearer ' + token)
    .send({ token: pass!.rawToken });
  expect(scan.status).toBe(200);
  expect(scan.body.data.currentAllotment.programmeId._id).toBe(String(cse._id));
  await C.withdraw(String(second.user._id));
  const revokedScan = await request(createApp())
    .post('/api/v1/verify/scan')
    .set('Authorization', 'Bearer ' + token)
    .send({ token: pass!.rawToken });
  expect(revokedScan.status).toBe(404);
  expect(await active(second)).toBeNull();
  expect(
    (await QRGatePass.findOne({ applicationId: second.app._id }))!.validity,
  ).toBe('Revoked');
  expect(
    (await C.inventory()).find(
      (p) => String(p.programmeId) === String(cse._id),
    )!.available,
  ).toBe(1);
});

it('expires unpaid offers and freezes paid Float seats in the final round', async () => {
  const p = await Programme.create({
    code: 'CSE',
    name: 'CSE',
    fee: 1,
    baseCapacity: 2,
  });
  const a = await applicant(1, [p]);
  const b = await applicant(2, [p]);
  const r = await round(true);
  await C.allocate(String(r._id));
  await C.publish(String(r._id));
  await C.respond(
    String((await active(a))!._id),
    String(a.user._id),
    SeatResponse.OptedNextRound,
  );
  await C.pay(String(a.user._id), 'success');
  await close(r._id);
  expect((await active(a))!.response).toBe('Accepted');
  expect(await active(b)).toBeNull();
  await expect(round()).rejects.toThrow('ended');
});

it('invalidates a preview after a competing counselling change', async () => {
  await Programme.create({ code: 'CSE', name: 'CSE', fee: 1, baseCapacity: 1 });
  const r = await round();
  await C.allocate(String(r._id));
  await counsellingTransaction(async () => undefined);
  await expect(C.publish(String(r._id))).rejects.toThrow('Recalculate');
  await C.allocate(String(r._id));
  await C.publish(String(r._id));
  expect((await AdmissionRound.findById(r._id))!.status).toBe('Published');
});
it('retains an unchanged Float backup and blocks withdrawal after its deadline', async () => {
  const p = await Programme.create({
    code: 'CSE',
    name: 'CSE',
    fee: 1,
    baseCapacity: 1,
  });
  const a = await applicant(1, [p]);
  const r1 = await round();
  await C.allocate(String(r1._id));
  await C.publish(String(r1._id));
  await C.respond(
    String((await active(a))!._id),
    String(a.user._id),
    SeatResponse.OptedNextRound,
  );
  await C.pay(String(a.user._id), 'success');
  await close(r1._id);
  const r2 = await round();
  await C.allocate(String(r2._id));
  await C.publish(String(r2._id));
  expect(String((await active(a))!.programmeId)).toBe(String(p._id));
  expect((await active(a))!.response).toBe(SeatResponse.OptedNextRound);
  await AdmissionRound.updateOne(
    { _id: r2._id },
    { withdrawalDeadline: new Date(Date.now() - 1000) },
  );
  await expect(C.withdraw(String(a.user._id))).rejects.toThrow('deadline');
  expect(String((await active(a))!.programmeId)).toBe(String(p._id));
});
