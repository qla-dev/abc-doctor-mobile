import WidgetKit
import SwiftUI

private let appGroup = "group.abc.qla.dev"

/// What the widget shows. The app writes these into the shared defaults after each review;
/// the widget never computes them itself, so a locked phone costs nothing to render.
struct ReviewEntry: TimelineEntry {
    let date: Date
    let due: Int
    let streak: Int
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ReviewEntry {
        ReviewEntry(date: Date(), due: 12, streak: 7)
    }

    func getSnapshot(in context: Context, completion: @escaping (ReviewEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ReviewEntry>) -> Void) {
        // Refreshed hourly rather than on a schedule tied to the next due card: WidgetKit
        // budgets reloads, and an hour is inside the granularity a study reminder needs.
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [readEntry()], policy: .after(next)))
    }

    private func readEntry() -> ReviewEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        return ReviewEntry(
            date: Date(),
            due: defaults?.integer(forKey: "cardsDue") ?? 0,
            streak: defaults?.integer(forKey: "streakDays") ?? 0
        )
    }
}

struct ABCDoctorWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("ABC Doctor")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text("\(entry.due)")
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundStyle(Color(red: 0.0, green: 0.48, blue: 1.0))
            Text(entry.due == 1 ? "card due" : "cards due")
                .font(.footnote)
                .foregroundStyle(.secondary)
            if entry.streak > 0 {
                Text("\(entry.streak) day streak")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct ABCDoctorWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ABCDoctorWidget", provider: Provider()) { entry in
            ABCDoctorWidgetView(entry: entry)
        }
        .configurationDisplayName("Cards due")
        .description("How many flashcards are waiting for review.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

@main
struct ABCDoctorWidgetBundle: WidgetBundle {
    var body: some Widget {
        ABCDoctorWidget()
    }
}
