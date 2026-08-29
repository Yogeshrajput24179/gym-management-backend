import Member from "./member.js";
import Trainer from "./trainer.js";
import Attendance from "./attendence.js";
import MembershipPlan from "./membershipPlan.js";
import Payment from "./payment.js";
import WorkoutPlan from "./workoutPlan.js";
import DietPlan from "./dietPlan.js";

// Member ↔ Attendance
Member.hasMany(Attendance, { foreignKey: "member_id" });
Attendance.belongsTo(Member, { foreignKey: "member_id" });

// Trainer ↔ Attendance
Trainer.hasMany(Attendance, { foreignKey: "trainer_id" });
Attendance.belongsTo(Trainer, { foreignKey: "trainer_id" });

// Membership Plan ↔ Member
Member.belongsTo(MembershipPlan, {
  foreignKey: 'membership_plan_id', 
  as: 'plan', // The exact alias we will use in the router
});
MembershipPlan.hasMany(Member, {
  foreignKey: 'membership_plan_id',
  as: 'members',
});

// Trainer ↔ Member (Removed the duplicate, kept the one with the alias)
Trainer.hasMany(Member, { foreignKey: "trainer_id", as: "members" });
Member.belongsTo(Trainer, { foreignKey: "trainer_id", as: "trainer_info" }); 

// Member ↔ Payment
Member.hasMany(Payment, { foreignKey: "member_id" });
Payment.belongsTo(Member, { foreignKey: "member_id" });

// Membership Plan ↔ Payment
MembershipPlan.hasMany(Payment, { foreignKey: "membership_plan_id" });
Payment.belongsTo(MembershipPlan, { foreignKey: "membership_plan_id" });

// Member ↔ WorkoutPlan
Member.hasMany(WorkoutPlan, { foreignKey: "member_id" });
WorkoutPlan.belongsTo(Member, { foreignKey: "member_id" });

// Member ↔ DietPlan
Member.hasMany(DietPlan, { foreignKey: "member_id" });
DietPlan.belongsTo(Member, { foreignKey: "member_id" });

export { Member, Trainer, Attendance, MembershipPlan, Payment, DietPlan, WorkoutPlan };