import { relations } from "drizzle-orm/relations";
import { users, schedules, forms, submissions, alerts } from "./schema";

export const schedulesRelations = relations(schedules, ({one, many}) => ({
	user_staffId: one(users, {
		fields: [schedules.staffId],
		references: [users.id],
		relationName: "schedules_staffId_users_id"
	}),
	form: one(forms, {
		fields: [schedules.formId],
		references: [forms.id]
	}),
	user_supervisorId: one(users, {
		fields: [schedules.supervisorId],
		references: [users.id],
		relationName: "schedules_supervisorId_users_id"
	}),
	submissions: many(submissions),
}));

export const usersRelations = relations(users, ({many}) => ({
	schedules_staffId: many(schedules, {
		relationName: "schedules_staffId_users_id"
	}),
	schedules_supervisorId: many(schedules, {
		relationName: "schedules_supervisorId_users_id"
	}),
	submissions: many(submissions),
	alerts: many(alerts),
}));

export const formsRelations = relations(forms, ({many}) => ({
	schedules: many(schedules),
	submissions: many(submissions),
	alerts: many(alerts),
}));

export const submissionsRelations = relations(submissions, ({one}) => ({
	schedule: one(schedules, {
		fields: [submissions.scheduleId],
		references: [schedules.id]
	}),
	user: one(users, {
		fields: [submissions.staffId],
		references: [users.id]
	}),
	form: one(forms, {
		fields: [submissions.formId],
		references: [forms.id]
	}),
}));

export const alertsRelations = relations(alerts, ({one}) => ({
	user: one(users, {
		fields: [alerts.staffId],
		references: [users.id]
	}),
	form: one(forms, {
		fields: [alerts.formId],
		references: [forms.id]
	}),
}));