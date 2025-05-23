import SwiftUI

struct CardStyle: ViewModifier {
    enum CardType {
        case primary
        case secondary
        case outline
        case elevated
    }
    
    let type: CardType
    let padding: CGFloat
    let cornerRadius: CGFloat
    
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(backgroundColor)
            .cornerRadius(cornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(borderColor, lineWidth: type == .outline ? 1 : 0)
            )
            .shadow(
                color: shadowColor,
                radius: shadowRadius,
                x: 0,
                y: shadowY
            )
    }
    
    private var backgroundColor: Color {
        switch type {
        case .primary:
            return Color.white
        case .secondary:
            return Color(.systemGray6)
        case .outline:
            return Color.white
        case .elevated:
            return Color.white
        }
    }
    
    private var borderColor: Color {
        switch type {
        case .outline:
            return Color(.systemGray4)
        default:
            return .clear
        }
    }
    
    private var shadowColor: Color {
        switch type {
        case .elevated:
            return Color.black.opacity(0.1)
        default:
            return Color.clear
        }
    }
    
    private var shadowRadius: CGFloat {
        switch type {
        case .elevated:
            return 4
        default:
            return 0
        }
    }
    
    private var shadowY: CGFloat {
        switch type {
        case .elevated:
            return 2
        default:
            return 0
        }
    }
}

struct Card<Content: View>: View {
    let type: CardStyle.CardType
    let padding: CGFloat
    let cornerRadius: CGFloat
    let content: Content
    
    init(
        type: CardStyle.CardType = .primary,
        padding: CGFloat = 16,
        cornerRadius: CGFloat = 12,
        @ViewBuilder content: () -> Content
    ) {
        self.type = type
        self.padding = padding
        self.cornerRadius = cornerRadius
        self.content = content()
    }
    
    var body: some View {
        content
            .modifier(CardStyle(
                type: type,
                padding: padding,
                cornerRadius: cornerRadius
            ))
    }
}

// EXAMPLES
#Preview {
    VStack(spacing: 20) {
        Card(type: .primary) {
            Text("Primary Card")
                .frame(maxWidth: .infinity)
                .padding()
        }
        
        Card(type: .secondary) {
            Text("Secondary Card")
                .frame(maxWidth: .infinity)
                .padding()
        }
        
        Card(type: .outline) {
            Text("Outline Card")
                .frame(maxWidth: .infinity)
                .padding()
        }
        
        Card(type: .elevated) {
            Text("Elevated Card")
                .frame(maxWidth: .infinity)
                .padding()
        }
    }
    .padding()
} 