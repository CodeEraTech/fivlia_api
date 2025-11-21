const mongoose = require("mongoose");

const expensesScheema = new mongoose.Schema(
  {
    title: String,
    type: { type: mongoose.Schema.Types.ObjectId, ref: "expenseType" },
    amount:Number,
    date: {
      from: { type: Date },
      to: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("expenses", expensesScheema);
