db.createUser({
  user: "root",
  pwd: "example",
  roles: [
    { role: "root", db: "admin" }
  ]
});

// Create databases and their users
db = db.getSiblingDB('spendsync_users');
db.createUser({
  user: "spendsync",
  pwd: "spendsyncdev",
  roles: [{ role: "readWrite", db: "spendsync_users" }]
});

db = db.getSiblingDB('spendsync_expenses');
db.createUser({
  user: "spendsync",
  pwd: "spendsyncdev",
  roles: [{ role: "readWrite", db: "spendsync_expenses" }]
});

db = db.getSiblingDB('spendsync_settlements');
db.createUser({
  user: "spendsync",
  pwd: "spendsyncdev",
  roles: [{ role: "readWrite", db: "spendsync_settlements" }]
});

db = db.getSiblingDB('spendsync_notifications');
db.createUser({
  user: "spendsync",
  pwd: "spendsyncdev",
  roles: [{ role: "readWrite", db: "spendsync_notifications" }]
}); 