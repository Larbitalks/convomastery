import { api } from './api'
import { cleanAvatar } from './avatar'
import { campOfClass, journeyOf, staysOf, unlockedCount, type MapPerson } from './discoveries'

/** Teacher: every student, worked out exactly from their awards and class moves. Hidden students are included and marked. */
export async function teacherMapPeople(): Promise<(MapPerson & { hidden?: boolean })[]> {
  const [students, classes, awards, moves] = await Promise.all([api.listStudents(), api.listClasses(), api.listAllAwards(), api.listClassMoves()])
  return students.map((s) => {
    const c = classes.find((x) => x.id === s.classId)
    const camp = campOfClass(c?.name, c?.level)
    const j = journeyOf(awards.filter((a) => a.studentId === s.id).map((a) => ({ points: a.points, at: a.createdAt })), staysOf(moves.filter((m) => m.studentId === s.id)), camp)
    return { key: s.id, name: s.name, avatar: s.avatar ?? null, camp, findsInCamp: j.unlocked.filter((u) => u.discovery.tier === camp).length, discoveries: j.unlocked.length, hidden: s.showOnMap === false }
  })
}

/** Student or parent: everyone their teacher shows on the map, from their progress code */
export async function studentMapPeople(code: string): Promise<MapPerson[]> {
  const list = await api.getStudentMap(code)
  if (!list) throw new Error('This code does not work.')
  return list.map((p, i) => ({
    key: `p${i}`, name: p.name, avatar: cleanAvatar(p.avatar), me: p.me, camp: campOfClass(p.className, p.classLevel),
    findsInCamp: Math.max(0, unlockedCount(p.total) - unlockedCount(p.atMove)), discoveries: unlockedCount(p.total),
  }))
}
