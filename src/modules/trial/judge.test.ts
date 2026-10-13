/**
 * 対象: trial/judge
 * 目的: 1 文字ごとの判定の規則を担保する
 * （正しい文字は先へ進む、違う文字はミス、濁点・半濁点・小さい文字を打つ途中の形はミスにしない）
 */
import { describe, it, expect } from "vitest";
import { isHalfwayForm, judgeInput } from "./judge";

describe("trial/judge isHalfwayForm", () => {
  it("濁点を付ける前の文字は途中の形", () => {
    expect(isHalfwayForm("が", "か")).toBe(true);
  });
  it("半濁点は、清音と濁音の両方が途中の形", () => {
    expect(isHalfwayForm("ぱ", "は")).toBe(true);
    expect(isHalfwayForm("ぱ", "ば")).toBe(true);
  });
  it("小さい文字は、大きい文字が途中の形", () => {
    expect(isHalfwayForm("っ", "つ")).toBe(true);
    expect(isHalfwayForm("ょ", "よ")).toBe(true);
  });
  it("「づ」は「つ」「っ」が途中の形", () => {
    expect(isHalfwayForm("づ", "つ")).toBe(true);
    expect(isHalfwayForm("づ", "っ")).toBe(true);
  });
  it("目当ての文字より後ろの形は途中の形ではない", () => {
    expect(isHalfwayForm("ば", "ぱ")).toBe(false);
    expect(isHalfwayForm("か", "が")).toBe(false);
  });
  it("同じキーを連打して出る文字（か→き）は途中の形ではない", () => {
    expect(isHalfwayForm("き", "か")).toBe(false);
  });
  it("切り替わりの無い文字には途中の形が無い", () => {
    expect(isHalfwayForm("ん", "わ")).toBe(false);
  });
});

describe("trial/judge judgeInput", () => {
  it("何も打っていなければ 0 文字", () => {
    expect(judgeInput("さくら", "")).toEqual({ confirmed: 0, pending: "", missed: false });
  });
  it("お題どおりに打った分だけ進む", () => {
    expect(judgeInput("さくら", "さく")).toEqual({ confirmed: 2, pending: "", missed: false });
    expect(judgeInput("さくら", "さくら")).toEqual({ confirmed: 3, pending: "", missed: false });
  });
  it("違う文字はミスになり、正しく打てた所までを返す", () => {
    expect(judgeInput("さくら", "さけ")).toEqual({ confirmed: 1, pending: "", missed: true });
  });
  it("途中の形はミスにせず、打っている途中として返す", () => {
    expect(judgeInput("がっこう", "か")).toEqual({ confirmed: 0, pending: "か", missed: false });
    expect(judgeInput("がっこう", "がつ")).toEqual({ confirmed: 1, pending: "つ", missed: false });
  });
  it("途中の形のまま次の文字を打ったらミス", () => {
    expect(judgeInput("がっこう", "かっ")).toEqual({ confirmed: 0, pending: "", missed: true });
  });
  it("お題より長く打ったらミス", () => {
    expect(judgeInput("さくら", "さくらん")).toEqual({ confirmed: 3, pending: "", missed: true });
  });
  it("打っている途中のローマ字はミスにせず、途中として返す", () => {
    expect(judgeInput("さくら", "s")).toEqual({ confirmed: 0, pending: "s", missed: false });
    expect(judgeInput("さくら", "さｋ")).toEqual({ confirmed: 1, pending: "ｋ", missed: false });
    expect(judgeInput("きょうりゅう", "ky")).toEqual({
      confirmed: 0,
      pending: "ky",
      missed: false,
    });
  });
  it("「っ」「ん」のあとに続くローマ字も途中として返す", () => {
    expect(judgeInput("がっこう", "がっk")).toEqual({ confirmed: 2, pending: "k", missed: false });
    expect(judgeInput("えんぴつ", "えn")).toEqual({ confirmed: 1, pending: "n", missed: false });
    expect(judgeInput("えんぴつ", "えんp")).toEqual({ confirmed: 2, pending: "p", missed: false });
  });
  it("ローマ字の前のひらがなが違っていればミス", () => {
    expect(judgeInput("さくら", "しk")).toEqual({ confirmed: 0, pending: "", missed: true });
  });
  it("ローマ字が 4 文字を超えたらミス（日本語入力がオフのまま打った場合）", () => {
    expect(judgeInput("さくら", "saku")).toEqual({ confirmed: 0, pending: "saku", missed: false });
    expect(judgeInput("さくら", "sakur")).toEqual({ confirmed: 0, pending: "", missed: true });
  });
  it("お題を打ち終えたあとのローマ字はミス", () => {
    expect(judgeInput("さくら", "さくらa")).toEqual({ confirmed: 3, pending: "", missed: true });
  });
  it("途中の形のあとにローマ字を打ったらミス", () => {
    expect(judgeInput("がっこう", "かk")).toEqual({ confirmed: 0, pending: "", missed: true });
  });
  it("漢字に変換されたらミス", () => {
    expect(judgeInput("さくら", "桜")).toEqual({ confirmed: 0, pending: "", missed: true });
  });
});
