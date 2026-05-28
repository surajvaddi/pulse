import { apiGet, type StaffMember } from "@/lib/api";

export default async function StaffPage() {
  const staff = await apiGet<StaffMember[]>("/operations/staff", "user_jordan_manager");

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Staff Directory</p>
        <h1>ICU staff visibility</h1>
      </div>
      <section className="panel">
        <div className="item-list">
          {staff.map((member) => (
            <article className="list-row" key={member.employeeId}>
              <div>
                <strong>{member.name}</strong>
                <span>
                  {member.role} - {member.availability}
                </span>
              </div>
              <span className="status-pill">{member.overtimeRisk} risk</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
